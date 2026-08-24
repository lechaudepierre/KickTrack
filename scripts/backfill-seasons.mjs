/**
 * RATTACHER LES PARTIES EXISTANTES À LA SAISON 0 — chantier 3.8.
 *
 * Depuis le 24/08, chaque partie porte son `seasonId` à la création. Les
 * parties d'avant n'en ont pas — et sans lui, le filtre par saison du profil
 * les ferait toutes disparaître.
 *
 * Elles appartiennent toutes à la saison 0 : c'est sa définition même, « la
 * période écoulée jusqu'à la première clôture ». Le rattachement n'est donc
 * pas une approximation, c'est la règle.
 *
 * Idempotent : une partie qui porte déjà un `seasonId` n'est pas touchée.
 *
 * Usage :
 *   node scripts/backfill-seasons.mjs            # simulation
 *   node scripts/backfill-seasons.mjs --apply    # écriture réelle
 */
import { db, APPLY, announceMode } from './_admin.mjs';

const SAISON = 'season_0';

announceMode(`Rattachement des parties sans saison à « ${SAISON} »`);

const parties = await db.collection('games').get();
const aReprendre = parties.docs.filter(d => !d.data().seasonId);
const dejaOk = parties.size - aReprendre.length;

console.log(`  ${parties.size} parties en base`);
console.log(`  ${dejaOk} portent déjà une saison`);
console.log(`  ${aReprendre.length} à rattacher\n`);

if (aReprendre.length > 0) {
    const parStatut = {};
    for (const d of aReprendre) {
        const s = d.data().status ?? '?';
        parStatut[s] = (parStatut[s] ?? 0) + 1;
    }
    console.log('  Par statut :', JSON.stringify(parStatut));

    const dates = aReprendre
        .map(d => d.data().startedAt?.toDate?.())
        .filter(Boolean)
        .sort((a, b) => a - b);
    if (dates.length > 0) {
        console.log(`  De ${dates[0].toISOString().slice(0, 10)} à ${dates[dates.length - 1].toISOString().slice(0, 10)}\n`);
    }
}

if (!APPLY) {
    console.log('  Rien n\'a été écrit. Relancer avec --apply.\n');
    process.exit(0);
}

let lot = db.batch();
let n = 0;
for (const d of aReprendre) {
    lot.update(d.ref, { seasonId: SAISON });
    if (++n % 400 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 400 !== 0) await lot.commit();

console.log(`  [ok] ${n} partie(s) rattachée(s) à « ${SAISON} ».\n`);
