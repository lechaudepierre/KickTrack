/**
 * Migration des bannières vers le socle collection — chantier 2.5.
 *
 * Remplace l'attribution EN DUR PAR PSEUDO par de vrais octrois par `userId`.
 * Corrige au passage le défaut connu : renommer son compte faisait perdre
 * sa bannière, puisque l'attribution dépendait du pseudo.
 *
 * Quatre opérations, toutes idempotentes :
 * 1. octroi de `creator` aux 3 fondateurs (résolus pseudo → userId)
 * 2. octroi des bannières spéciales (Matricule13 → veloTDF)
 * 3. `user.bannerId` existant → `equipped.banner`
 * 4. équiper la bannière possédée quand RIEN n'est équipé
 *
 * L'étape 4 est celle qui permet de retirer le repli par pseudo. Sans elle,
 * trois joueurs sur quatre possèdent leur bannière sans l'avoir équipée : ils
 * ne la voient que grâce au repli, et le supprimer la leur ferait perdre en
 * silence (relevé le 24/08).
 *
 * ⚠️ ÉCRIT SUR DES DOCUMENTS UTILISATEUR RÉELS. Simulation par défaut.
 *
 * Usage :
 * node scripts/migrate-banners.mjs # simulation
 * node scripts/migrate-banners.mjs --apply # écriture réelle
 */
import { db, APPLY, announceMode } from './_admin.mjs';
import { Timestamp } from 'firebase-admin/firestore';

// Doit rester aligné sur src/lib/utils/bannerUtils.ts jusqu'à sa suppression.
const CREATOR_USERNAMES = ['Astroboy', 'PIGEON ou BAGARRE', 'lechauvepierre'];
const SPECIAL_BANNERS = { 'Matricule13': 'veloTDF' };

/** Réimplémente grantItem en JS pur (les scripts ne passent pas par le bundler TS). */
async function grantItem(userId, itemId, source, sourceRef) {
    const grantId = `${source}${sourceRef ? `:${sourceRef}` : ''}:${itemId}`;
    const userRef = db.collection('users').doc(userId);
    const grantRef = userRef.collection('grants').doc(grantId);
    const invRef = userRef.collection('inventory').doc(itemId);

    if (!APPLY) {
        const [g, i] = await Promise.all([grantRef.get(), invRef.get()]);
        return { simulated: true, alreadyProcessed: g.exists, duplicate: i.exists };
    }

    return db.runTransaction(async (tx) => {
        const [g, i] = await Promise.all([tx.get(grantRef), tx.get(invRef)]);
        if (g.exists) return { alreadyProcessed: true, duplicate: g.data().duplicate };

        const duplicate = i.exists;
        const now = Timestamp.now();
        if (!duplicate) tx.set(invRef, { itemId, source, ...(sourceRef ? { sourceRef } : {}), grantedAt: now });
        tx.set(grantRef, { grantId, itemId, source, ...(sourceRef ? { sourceRef } : {}), duplicate, grantedAt: now });
        return { alreadyProcessed: false, duplicate };
    });
}

async function findByUsername(username) {
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    return snap.empty ? null : snap.docs[0];
}

async function main() {
    announceMode('Migration des bannières → socle collection');

    const catalog = await db.collection('catalog').get();
    if (catalog.empty) {
        console.error('[echec] Le catalogue est vide. Lancer d\'abord : node scripts/seed-catalog.mjs --apply');
        process.exit(1);
    }

    // ─── 1 & 2 : attributions historiques ────────────────────────────────────
    console.log('── Attributions par pseudo → octrois par userId ──\n');
    const assignments = [
        ...CREATOR_USERNAMES.map(u => [u, 'creator', 'createur']),
        ...Object.entries(SPECIAL_BANNERS).map(([u, item]) => [u, item, 'exploit']),
    ];

    for (const [username, itemId, source] of assignments) {
        const doc = await findByUsername(username);
        if (!doc) {
            console.log(` ⚠️ « ${username} » : aucun compte à ce pseudo — octroi impossible`);
            continue;
        }
        const res = await grantItem(doc.id, itemId, source, 'migration_v1');
        const status = res.alreadyProcessed ? 'déjà octroyé' : res.duplicate ? 'déjà possédé' : 'octroyé';
        console.log(` [ok] ${username.padEnd(20)} → ${itemId.padEnd(10)} [${status}] uid=${doc.id}`);
    }

    // ─── 3 : bannerId → equipped.banner ──────────────────────────────────────
    console.log('\n── bannerId existant → equipped.banner ──\n');
    const users = await db.collection('users').get();
    let migrated = 0, alreadyOk = 0, orphan = 0;
    const knownItems = new Set(catalog.docs.map(d => d.id));

    for (const doc of users.docs) {
        const data = doc.data();
        if (!data.bannerId) continue;

        if (data.equipped?.banner?.itemId === data.bannerId) { alreadyOk++; continue; }

        if (!knownItems.has(data.bannerId)) {
            console.log(` ⚠️ ${(data.username ?? doc.id).padEnd(20)} bannerId « ${data.bannerId} » absent du catalogue — ignoré`);
            orphan++;
            continue;
        }

        console.log(` → ${(data.username ?? doc.id).padEnd(20)} equipped.banner = ${data.bannerId}`);
        if (APPLY) {
            await doc.ref.update({ equipped: { ...(data.equipped ?? {}), banner: { itemId: data.bannerId } } });
            // Le joueur doit aussi POSSÉDER ce qu'il équipe.
            await grantItem(doc.id, data.bannerId, 'createur', 'migration_v1');
        }
        migrated++;
    }

    console.log(`\n${users.size} profils parcourus : ${migrated} à migrer, ${alreadyOk} déjà à jour, ${orphan} orphelin(s).`);

    // ─── 4 : équiper ce qui est possédé, si rien ne l'est ────────────────────
    //
    // C'est l'étape qui rend le repli par pseudo inutile. On n'équipe QUE si
    // le joueur n'a rien choisi : on ne remplace jamais un choix explicite.
    console.log('\n── Équiper la bannière possédée quand rien n\'est équipé ──\n');
    let equipes = 0, deja = 0, sansItem = 0;

    for (const doc of users.docs) {
        const data = doc.data();
        if (data.equipped?.banner?.itemId) { deja++; continue; }

        const inv = await doc.ref.collection('inventory').get();
        // Une seule bannière possédée : le choix est évident. Plusieurs : on
        // ne devine pas à la place du joueur, il choisira dans son profil.
        const bannieres = inv.docs
            .map(d => d.id)
            .filter(id => catalog.docs.find(c => c.id === id)?.data().type === 'banner');

        if (bannieres.length === 0) { sansItem++; continue; }
        if (bannieres.length > 1) {
            console.log(` ~ ${(data.username ?? doc.id).padEnd(20)} ${bannieres.length} bannières possédées — laissé au joueur`);
            continue;
        }

        console.log(` → ${(data.username ?? doc.id).padEnd(20)} equipped.banner = ${bannieres[0]}`);
        if (APPLY) {
            await doc.ref.update({ equipped: { ...(data.equipped ?? {}), banner: { itemId: bannieres[0] } } });
        }
        equipes++;
    }

    console.log(`\n${equipes} à équiper, ${deja} avaient déjà choisi, ${sansItem} ne possèdent aucune bannière.`);
    console.log(APPLY ? '\n[ok] Migration appliquée.' : '\n Rien n\'a été écrit. Relancer avec --apply.');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
