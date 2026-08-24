/**
 * Octroie un item du catalogue à des joueurs — outil d'administration.
 *
 * Sert aux items à octroi MANUEL : le titre de fondateur, un cas particulier,
 * une compensation. Tout ce qui n'est ni une récompense de saison ni un tirage
 * de pack passe par ici.
 *
 * Reproduit exactement la sémantique de `lib/collection/grant.ts` — même
 * `grantId` déterministe, même journal, même empilement des exemplaires — pour
 * qu'un octroi manuel ne se distingue en rien d'un octroi automatique.
 * Rejouable sans risque : le journal empêche le doublon.
 *
 * Usage :
 *   node scripts/grant-item.mjs titre_fondateur --to "Astroboy,lechauvepierre" [--apply]
 */
import { db, APPLY, announceMode } from './_admin.mjs';
import { Timestamp } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const itemId = args.find(a => !a.startsWith('--'));
const idxTo = args.indexOf('--to');
const pseudos = idxTo > -1 ? (args[idxTo + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean) : [];

if (!itemId || pseudos.length === 0) {
    console.error('Usage : node scripts/grant-item.mjs <itemId> --to "pseudo1,pseudo2" [--apply]');
    process.exit(1);
}

announceMode(`Octroi de « ${itemId} »`);

const catalogSnap = await db.collection('catalog').doc(itemId).get();
if (!catalogSnap.exists) {
    console.error(`  Item inconnu au catalogue : « ${itemId} »`);
    process.exit(1);
}
const item = catalogSnap.data();
console.log(`  ${item.meta?.name} (${item.type}, ${item.rarity}, source ${item.source})\n`);

// Même règle que `buildGrantId` : sans sourceRef, l'octroi est unique par source.
const grantId = `${item.source}:${itemId}`;

for (const pseudo of pseudos) {
    const snap = await db.collection('users')
        .where('usernameLowercase', '==', pseudo.toLowerCase())
        .get();

    if (snap.empty) { console.log(`    ${pseudo.padEnd(24)} INTROUVABLE`); continue; }

    const userRef = snap.docs[0].ref;
    const [grantSnap, invSnap] = await Promise.all([
        userRef.collection('grants').doc(grantId).get(),
        userRef.collection('inventory').doc(itemId).get(),
    ]);

    if (grantSnap.exists) { console.log(`    ${pseudo.padEnd(24)} déjà octroyé`); continue; }
    const duplicate = invSnap.exists;
    console.log(`    ${pseudo.padEnd(24)} ${APPLY ? 'octroi' : 'à octroyer'}${duplicate ? ' (exemplaire supplémentaire)' : ''}`);

    if (!APPLY) continue;

    const now = Timestamp.now();
    const lot = db.batch();
    if (duplicate) {
        const q = invSnap.data().quantity;
        lot.update(userRef.collection('inventory').doc(itemId), {
            quantity: (typeof q === 'number' && q > 0 ? Math.floor(q) : 1) + 1,
        });
    } else {
        lot.set(userRef.collection('inventory').doc(itemId), {
            itemId, source: item.source, grantedAt: now, quantity: 1,
        });
    }
    lot.set(userRef.collection('grants').doc(grantId), {
        grantId, itemId, source: item.source, duplicate, addedCopy: true, grantedAt: now,
    });
    await lot.commit();
}

if (!APPLY) console.log('\n  Rien n\'a été écrit. Relancer avec --apply.\n');
else console.log('\n  [ok] Terminé.\n');
