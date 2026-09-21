/**
 * CONTRÔLE — un ELO cassé sur un profil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SCRIPT EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Constaté le 21/09, au lendemain de la clôture : un joueur portait
 * `stats.elo = 0` alors que sa dernière partie enregistrait un ELO de 1322.
 * Un ELO nul le plaçait dernier du classement, et lui donnait le grade le plus
 * bas — sans qu'aucune erreur ne soit levée nulle part.
 *
 * Aucun chemin du code ne produit cette valeur : ni la fin de partie, qui
 * additionne (`elo + eloChange`), ni la clôture, qui comprime. Elle vient donc
 * d'ailleurs — écriture manuelle, script, ou outil d'administration.
 *
 * D'où ce contrôle : on ne sait pas d'où ça vient, mais on saura que c'est
 * arrivé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA VALEUR DE RÉFÉRENCE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le `newElo` de la DERNIÈRE partie terminée du joueur. C'est la seule source
 * qui fasse foi : le profil peut être écrasé, la partie non — elle est écrite
 * une fois, par le serveur, et protégée en modification par les règles.
 *
 * Usage :
 *   node scripts/audit-elo.mjs            # constat seul, rien n'est écrit
 *   node scripts/audit-elo.mjs --apply    # répare depuis l'historique
 */

import { db, APPLY, announceMode } from './_admin.mjs';

const ELO_BASE = 1000;

announceMode('Contrôle des ELO de profil');

const users = await db.collection('users').get();
const casses = [];
let sains = 0;

for (const doc of users.docs) {
    const u = doc.data();
    const parties = u.stats?.totalGames ?? 0;
    if (parties === 0) continue;

    const elo = u.stats?.elo;
    const valide = typeof elo === 'number' && Number.isFinite(elo) && elo > 0;
    if (valide) { sains++; continue; }

    // La derniere partie terminee fait foi.
    const dernieres = await db.collection('games')
        .where('playerIds', 'array-contains', doc.id)
        .where('status', '==', 'completed')
        .orderBy('startedAt', 'desc')
        .limit(1)
        .get();

    const change = dernieres.empty ? null : dernieres.docs[0].data().eloChanges?.[doc.id];
    const reference = typeof change?.newElo === 'number' ? change.newElo : null;

    casses.push({
        ref: doc.ref,
        username: u.username ?? doc.id,
        elo,
        peakElo: u.stats?.peakElo,
        parties,
        reference,
    });
}

console.log(`  ${sains + casses.length} profil(s) avec des parties`);
console.log(`  ${casses.length} ELO casse(s)\n`);

for (const c of casses) {
    const cible = c.reference ?? ELO_BASE;
    const origine = c.reference !== null ? 'derniere partie' : 'valeur de depart, aucune partie exploitable';
    console.log(`  ${String(c.username).padEnd(22)} elo=${JSON.stringify(c.elo)} pic=${c.peakElo} parties=${c.parties}`);
    console.log(`     -> ${cible}   (${origine})`);
}

if (casses.length === 0) {
    console.log('  Rien a signaler.\n');
    process.exit(0);
}

if (!APPLY) {
    console.log('\n  Rien n\'a ete ecrit. Relancer avec --apply pour reparer.\n');
    process.exit(0);
}

let n = 0;
for (const c of casses) {
    const cible = c.reference ?? ELO_BASE;
    // `peakElo` ne doit jamais descendre sous l'ELO courant, sinon le profil
    // afficherait un record inferieur a la valeur du jour.
    const pic = Math.max(typeof c.peakElo === 'number' ? c.peakElo : 0, cible);
    await c.ref.update({ 'stats.elo': cible, 'stats.peakElo': pic });
    n++;
}

console.log(`\n  [ok] ${n} profil(s) repare(s).\n`);
