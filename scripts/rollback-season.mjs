/**
 * RETOUR ARRIÈRE COMPLET d'une clôture de saison — chantier 3.7.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SCRIPT EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Exigence explicite de Sacha : « J'aimerais bien juste tester la mise en
 * saison et dans les dix minutes revenir en arrière. »
 *
 * `revoke-season.mjs` ne rend que les RÉCOMPENSES. La compression de l'ELO,
 * elle, restait définitive : une clôture d'essai aurait donc comprimé l'ELO de
 * cent quarante joueurs sans retour possible. C'est exactement le genre de
 * chose qu'on découvre le jour où on en a besoin.
 *
 * Ce script défait TOUT : récompenses, ELO, compteurs, archives, et l'ouverture
 * de la nouvelle saison.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA FENÊTRE DE SÉCURITÉ
 * ═══════════════════════════════════════════════════════════════════════════
 * Une annulation n'est sûre que tant qu'AUCUNE PARTIE n'a été jouée depuis la
 * clôture. Passé ce point, restaurer les anciens ELO écraserait des résultats
 * légitimes — les parties de la nouvelle saison auraient été jouées, comptées,
 * puis effacées sans que personne ne le voie.
 *
 * Le script DÉTECTE ce cas et REFUSE. Il ne propose pas de forcer : si des
 * parties ont été jouées, le retour arrière n'est plus la bonne opération.
 *
 * Usage :
 *   node scripts/rollback-season.mjs season_0            # simulation
 *   node scripts/rollback-season.mjs season_0 --apply    # pour de vrai
 */
import { db, APPLY, announceMode } from './_admin.mjs';

const seasonId = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!seasonId) {
    console.error('Usage : node scripts/rollback-season.mjs <seasonId> [--apply]');
    process.exit(1);
}

announceMode(`Retour arrière de la clôture « ${seasonId} »`);

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * UN HUMAIN, DEVANT UN VRAI TERMINAL — même règle que la clôture
 * ═══════════════════════════════════════════════════════════════════════════
 * Ce script restaure des ELO et EFFACE des archives de saison. Lancé par
 * erreur après une vraie clôture, il détruirait le travail de toute une
 * saison.
 *
 * Comme `close-season.ts`, il exige donc un terminal interactif : une commande
 * lancée par un agent, un script ou un cron reçoit des tuyaux, et `isTTY` y
 * vaut `false`.
 */
if (APPLY && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    console.error('\n  ═══════════════════════════════════════════════════════════════');
    console.error('  REFUS — cette commande exige un terminal interactif.');
    console.error('  ═══════════════════════════════════════════════════════════════\n');
    console.error('  Le retour arrière restaure des ELO et efface des archives de');
    console.error('  saison. Il doit être lancé à la main, par une personne, dans un');
    console.error('  vrai terminal — jamais par un script, un agent ou un cron.\n');
    process.exit(1);
}

// ─── La saison a-t-elle seulement été clôturée ? ─────────────────────────────
const seasonSnap = await db.collection('seasons').doc(seasonId).get();
if (!seasonSnap.exists) {
    console.error(`\n[echec] Aucune saison « ${seasonId} ». Rien à annuler.\n`);
    process.exit(1);
}
const season = seasonSnap.data();
if (season.status !== 'closed') {
    console.error(`\n[echec] « ${seasonId} » n'est pas clôturée (statut : ${season.status}).\n`);
    process.exit(1);
}

const closedAt = season.closedAt?.toDate?.() ?? null;
if (!closedAt) {
    console.error(`\n[echec] « ${seasonId} » n'a pas de date de clôture — impossible de vérifier la fenêtre de sécurité.\n`);
    process.exit(1);
}
console.log(`  Clôturée le ${closedAt.toISOString()}`);

// ─── LA FENÊTRE DE SÉCURITÉ ──────────────────────────────────────────────────
// Une partie jouée après la clôture rend le retour arrière destructeur.
const parties = await db.collection('games')
    .where('startedAt', '>', season.closedAt)
    .get();

if (parties.size > 0) {
    console.error(`\n[refus] ${parties.size} partie(s) ont été jouées depuis la clôture.\n`);
    for (const d of parties.docs.slice(0, 5)) {
        const g = d.data();
        console.error(`    ${d.id}  ${g.startedAt?.toDate?.().toISOString() ?? '?'}  statut ${g.status}`);
    }
    if (parties.size > 5) console.error(`    … et ${parties.size - 5} autre(s)`);
    console.error('\n  Restaurer les anciens ELO écraserait ces résultats. Le retour');
    console.error('  arrière n\'est plus la bonne opération : il faut décider quoi faire');
    console.error('  de ces parties d\'abord.\n');
    process.exit(1);
}
console.log('  [ok] Aucune partie jouée depuis la clôture — le retour arrière est sûr.');

// ─── Ce qu'il y a à défaire ──────────────────────────────────────────────────
const users = await db.collection('users').get();
const aRestaurer = [];
let sansArchive = 0;

for (const u of users.docs) {
    const arch = await u.ref.collection('seasons').doc(seasonId).get();
    if (!arch.exists) continue;
    const a = arch.data();
    if (!a.avant) { sansArchive++; continue; }
    aRestaurer.push({ ref: u.ref, username: u.data().username, avant: a.avant, apres: u.data().stats?.elo });
}

const grants = [];
for (const u of users.docs) {
    const g = await u.ref.collection('grants').where('sourceRef', '==', `${seasonId}_close`).get();
    for (const d of g.docs) grants.push({ userId: u.id, grantId: d.id, itemId: d.data().itemId });
}

console.log(`\n  ${aRestaurer.length} profil(s) à restaurer, ${grants.length} récompense(s) à retirer.`);
if (sansArchive > 0) {
    console.log(`  ⚠️ ${sansArchive} archive(s) sans état d'avant : ces profils NE SERONT PAS restaurés.`);
    console.log('     (clôture antérieure au chantier 3.7)');
}
for (const r of aRestaurer.slice(0, 5)) {
    console.log(`    ${String(r.username).padEnd(22)} ${r.apres} → ${r.avant.elo}`);
}
if (aRestaurer.length > 5) console.log(`    … et ${aRestaurer.length - 5} autre(s)`);

if (!APPLY) {
    console.log('\n  Rien n\'a été écrit. Relancer avec --apply.\n');
    process.exit(0);
}
// ─── L'ordre inverse de la clôture ───────────────────────────────────────────
// 1. retirer les récompenses ; 2. rendre l'ELO et les compteurs ;
// 3. effacer les archives ; 4. rouvrir la saison.
const { revokeGrant } = await import('../src/lib/collection/grant.ts');
for (const g of grants) await revokeGrant(db, g.userId, g.grantId);
console.log(`\n  [ok] ${grants.length} récompense(s) retirée(s)`);

let lot = db.batch();
let n = 0;
for (const r of aRestaurer) {
    // `null` dans l'archive veut dire « le champ n'existait pas » : on le
    // remet à zéro plutôt que d'écrire null, qui n'est pas la même chose.
    lot.update(r.ref, {
        'stats.elo': r.avant.elo,
        'stats.peakElo': r.avant.peakElo ?? r.avant.elo,
        'stats.seasonGames': r.avant.seasonGames ?? 0,
        'stats.seasonId': r.avant.seasonId ?? seasonId,
        'stats.playedPreviousSeason': r.avant.playedPreviousSeason ?? false,
    });
    lot.delete(r.ref.collection('seasons').doc(seasonId));
    if (++n % 200 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 200 !== 0) await lot.commit();
console.log(`  [ok] ${aRestaurer.length} profil(s) restauré(s), archives effacées`);

/*
 * Les packs d'ouverture repartent aussi.
 *
 * On les reconnaît à leur `sourceRef`. Le compteur de non-ouverts est ensuite
 * RECALCULÉ depuis ce qui reste, pas décrémenté : une dérivation ne peut pas
 * dériver, un décrément si.
 */
let lotPacks = db.batch();
let packsRetires = 0;
let np = 0;
for (const r of aRestaurer) {
    const packs = await r.ref.collection('packs').where('sourceRef', '==', `${seasonId}_close`).get();
    for (const d of packs.docs) { lotPacks.delete(d.ref); packsRetires++; }
    if (++np % 100 === 0) { await lotPacks.commit(); lotPacks = db.batch(); }
}
if (np % 100 !== 0) await lotPacks.commit();

if (packsRetires > 0) {
    let lotCompteurs = db.batch();
    let nc = 0;
    for (const r of aRestaurer) {
        const restants = await r.ref.collection('packs').get();
        const nonOuverts = restants.docs.filter(d => !d.data().itemId).length;
        lotCompteurs.update(r.ref, { packsUnopened: nonOuverts });
        if (++nc % 200 === 0) { await lotCompteurs.commit(); lotCompteurs = db.batch(); }
    }
    if (nc % 200 !== 0) await lotCompteurs.commit();
}
console.log(`  [ok] ${packsRetires} pack(s) d'ouverture retiré(s)`);

// L'instantané du classement disparaît aussi : il décrivait une clôture qui
// n'a plus eu lieu.
const standings = await db.collection('seasons').doc(seasonId).collection('standings').get();
lot = db.batch(); n = 0;
for (const d of standings.docs) {
    lot.delete(d.ref);
    if (++n % 200 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 200 !== 0) await lot.commit();

await db.collection('seasons').doc(seasonId).set(
    { status: 'active', closedAt: null, eloReset: null }, { merge: true });
console.log(`  [ok] ${standings.size} ligne(s) de classement effacée(s), « ${seasonId} » rouverte`);

console.log('\n  Retour arrière terminé. La saison suivante ouverte par la clôture');
console.log('  reste en base : la supprimer à la main si elle gêne.\n');
