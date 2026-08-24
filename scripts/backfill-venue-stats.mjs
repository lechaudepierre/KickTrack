/**
 * Reconstitue `stats.venues` pour tous les joueurs — chantier 9.36.
 *
 * À lancer UNE FOIS après la mise en service des compteurs par stade : sans
 * ça, les classements par stade seraient vides jusqu'à ce que chacun ait
 * rejoué partout.
 *
 * Relit l'historique complet des parties, applique exactement la même règle
 * d'accumulation que la fin de partie, et écrit le résultat. Rejouable sans
 * risque : le calcul REMPLACE la carte au lieu de l'incrémenter, donc lancer
 * deux fois donne le même résultat.
 *
 * Usage : node scripts/backfill-venue-stats.mjs [--apply]
 */
import { db, APPLY, announceMode } from './_admin.mjs';

/** Copie de la règle de `lib/game/venueStats.ts`, que ce script ne peut pas importer (TypeScript). */
const estStadeReel = (id) => !!id && id !== 'none' && !id.includes('.') && !id.includes('/');

announceMode('Reconstitution des statistiques par stade');

const games = await db.collection('games').get();
console.log(`  ${games.size} parties lues\n`);

/** userId -> { venueId -> compteurs } */
const parJoueur = new Map();
let retenues = 0;

for (const doc of games.docs) {
    const g = doc.data();
    if (g.status !== 'completed') continue;
    if (g.winner === undefined || g.winner === null) continue;
    if (!estStadeReel(g.venueId)) continue;
    if (g.isGuestGame) continue;

    const teams = g.teams ?? [];
    const avecInvite = teams.some(t => (t.players ?? []).some(p => String(p.userId).startsWith('guest_')));
    if (avecInvite) continue;

    retenues++;

    for (let i = 0; i < teams.length; i++) {
        const gagnante = i === g.winner;
        for (const p of teams[i].players ?? []) {
            if (!p.userId || String(p.userId).startsWith('guest_')) continue;

            const buts = (g.goals ?? []).filter(x => x.scoredBy === p.userId).length;
            const carte = parJoueur.get(p.userId) ?? {};
            const c = carte[g.venueId] ?? { games: 0, wins: 0, goalsScored: 0 };
            carte[g.venueId] = {
                games: c.games + 1,
                wins: c.wins + (gagnante ? 1 : 0),
                goalsScored: c.goalsScored + buts,
            };
            parJoueur.set(p.userId, carte);
        }
    }
}

console.log(`  ${retenues} parties retenues, ${parJoueur.size} joueurs concernés\n`);

const apercu = [...parJoueur.entries()].slice(0, 3);
for (const [uid, carte] of apercu) {
    const detail = Object.entries(carte).map(([v, c]) => `${v.slice(0, 8)}: ${c.games}p/${c.wins}v`).join('  ');
    console.log(`    ${uid.slice(0, 12)}  ${detail}`);
}

if (!APPLY) {
    console.log('\n  Rien n\'a été écrit. Relancer avec --apply.\n');
    process.exit(0);
}

let ecrits = 0;
let lot = db.batch();
let dansLeLot = 0;

for (const [uid, carte] of parJoueur) {
    lot.update(db.collection('users').doc(uid), { 'stats.venues': carte });
    dansLeLot++; ecrits++;
    if (dansLeLot === 400) { await lot.commit(); lot = db.batch(); dansLeLot = 0; }
}
if (dansLeLot > 0) await lot.commit();

console.log(`\n  [ok] ${ecrits} profil(s) mis à jour.\n`);
