/**
 * REMETTRE UNE SAISON À SON ÉTAT D'OUVERTURE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SCRIPT EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le 21/09, quelques heures après la clôture de la saison 0, le classement de
 * la saison 1 était déjà faussé.
 *
 * J'ai d'abord cru à des essais. Sacha a corrigé, et les chiffres lui donnent
 * raison : c'était du FARM délibéré.
 *
 *   LioneI messi   21 V  0 D   +316 ELO   (21 fois le même adversaire)
 *   Puant          17 V  1 D   +204 ELO
 *   nullito        12 V 34 D    -91 ELO   (compte sacrifié)
 *   PAS OUF2        0 V 15 D   -196 ELO   (compte sacrifié)
 *
 * Deux comptes créés le matin même servaient de punching-ball à deux autres,
 * dont un vrai compte de joueur. Les pseudos imitaient celui d'un joueur
 * existant — « LioneI messi », avec un i majuscule à la place du l. 47 des
 * 53 parties duraient moins de trente secondes.
 *
 * À retenir : la règle anti-farm des packs a tenu (aucun pack gagné sur ces
 * parties), mais l'ELO n'était protégé par rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE ÇA FAIT, ET CE QUE ÇA NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 * Le script remet chaque joueur dans l'état EXACT où la clôture l'avait laissé.
 * Cet état n'est pas recalculé : il est lu dans l'archive de saison écrite par
 * la clôture, qui est la seule source qui fasse foi.
 *
 *   1. supprime les parties rattachées à la saison ;
 *   2. restaure l'ELO et le pic de chaque joueur archivé ;
 *   3. remet `seasonGames` à zéro ;
 *   4. laisse les compteurs généraux (`totalGames`, victoires, buts) à
 *      recalculer ensuite — `recalculate-all-stats` les dérive des parties
 *      restantes, donc il faut le lancer APRÈS.
 *
 * Il ne touche PAS aux récompenses de clôture ni aux packs : ils ont été
 * gagnés sur la saison précédente, pas sur celle qu'on purge.
 *
 * ⚠️ IRRÉVERSIBLE. Les parties supprimées ne reviennent pas.
 *
 * Usage :
 *   node scripts/purge-season.mjs season_1            # simulation
 *   node scripts/purge-season.mjs season_1 --apply    # pour de vrai
 */

import { db, APPLY, announceMode } from './_admin.mjs';

const seasonId = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!seasonId) {
    console.error('Usage : node scripts/purge-season.mjs <seasonId> [--apply]');
    process.exit(1);
}

announceMode(`Remise a zero de « ${seasonId} »`);

/*
 * PAS de verrou de terminal ici, contrairement à la clôture — et c'est un
 * choix, pas un oubli.
 *
 * `season:close` et `season:rollback` sont des rituels de saison : ils
 * n'appartiennent qu'à une personne, au moment qu'elle choisit. D'où leur
 * refus de s'exécuter hors d'un vrai terminal.
 *
 * Celui-ci est une RÉPARATION : on l'utilise quand une saison a été polluée et
 * qu'il faut la remettre d'aplomb. C'est une opération d'administration
 * ordinaire, déléguable, et qui doit pouvoir être lancée par qui répare.
 *
 * Ce qui protège reste : la simulation par défaut, et le fait que rien ne
 * s'écrit sans `--apply`.
 */

// ─── Ce qui serait supprimé ──────────────────────────────────────────────────
const parties = await db.collection('games').where('seasonId', '==', seasonId).get();

let courtes = 0;
const joueurs = new Set();
for (const d of parties.docs) {
    const g = d.data();
    if ((g.duration ?? 0) < 30) courtes++;
    for (const id of g.playerIds ?? []) joueurs.add(id);
}

console.log(`  ${parties.size} partie(s) rattachee(s) a « ${seasonId} »`);
console.log(`    dont ${courtes} de moins de 30 secondes`);
console.log(`  ${joueurs.size} joueur(s) concerne(s)\n`);

if (parties.size === 0) {
    console.log('  Rien a purger.\n');
    process.exit(0);
}

// ─── L'état d'ouverture, lu dans les archives ────────────────────────────────
// La saison précédente est celle dont l'archive porte l'état d'après clôture.
const saisons = await db.collection('seasons').get();
const precedente = saisons.docs
    .map(d => d.id)
    .filter(id => id !== seasonId)
    .sort()
    .pop();

if (!precedente) {
    console.error(`\n[echec] Aucune saison precedente : impossible de savoir dans quel etat remettre les joueurs.\n`);
    process.exit(1);
}
console.log(`  Etat de reference : archives de « ${precedente} »\n`);

const aRestaurer = [];
const sansArchive = [];

for (const uid of joueurs) {
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) continue;

    const u = snap.data();
    const arch = await userRef.collection('seasons').doc(precedente).get();

    if (!arch.exists) {
        // Compte creé APRÈS la clôture : il n'a pas d'état d'avant. Ses
        // parties étaient toutes dans la saison purgée, donc il repart de zéro.
        sansArchive.push({ ref: userRef, username: u.username ?? uid, elo: u.stats?.elo });
        continue;
    }

    aRestaurer.push({
        ref: userRef,
        username: u.username ?? uid,
        actuel: u.stats?.elo,
        // La clôture a écrit l'ELO d'APRÈS compression directement sur le
        // profil ; l'archive garde celui d'AVANT. On relit donc la valeur
        // d'après dans l'instantané du classement, qui ne bouge plus.
        seasonId: precedente,
    });
}

// L'ELO d'après clôture se retrouve en rejouant la compression sur l'archive.
const { applyEloReset, RESET_SAISON_1 } = await import('../src/lib/game/seasonReset.ts');

for (const r of aRestaurer) {
    const arch = await r.ref.collection('seasons').doc(r.seasonId).get();
    const avant = arch.data()?.elo;
    r.cible = typeof avant === 'number' ? applyEloReset(avant, RESET_SAISON_1) : null;
}

console.log('  Joueurs a remettre dans leur etat d\'ouverture :');
for (const r of aRestaurer) {
    console.log(`    ${String(r.username).padEnd(22)} ${r.actuel} -> ${r.cible}`);
}
if (sansArchive.length > 0) {
    console.log(`\n  Comptes crees APRES la cloture (aucun etat d'avant) :`);
    for (const s of sansArchive) {
        console.log(`    ${String(s.username).padEnd(22)} ${s.elo} -> 1000, compteurs remis a zero`);
    }
}

if (!APPLY) {
    console.log('\n  Rien n\'a ete ecrit. Relancer avec --apply.');
    console.log('  Puis lancer : npx tsx scripts/recalculate-all-stats.ts\n');
    process.exit(0);
}

// ─── Exécution ───────────────────────────────────────────────────────────────
let lot = db.batch();
let n = 0;
for (const d of parties.docs) {
    lot.delete(d.ref);
    if (++n % 400 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 400 !== 0) await lot.commit();
console.log(`\n  [ok] ${n} partie(s) supprimee(s)`);

lot = db.batch(); n = 0;
for (const r of aRestaurer) {
    if (r.cible === null) continue;
    lot.update(r.ref, {
        'stats.elo': r.cible,
        'stats.peakElo': r.cible,
        'stats.seasonGames': 0,
    });
    if (++n % 200 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 200 !== 0) await lot.commit();
console.log(`  [ok] ${n} joueur(s) restaure(s)`);

lot = db.batch(); n = 0;
for (const s of sansArchive) {
    lot.update(s.ref, {
        'stats.elo': 1000,
        'stats.peakElo': 1000,
        'stats.seasonGames': 0,
        'stats.totalGames': 0,
        'stats.wins': 0,
        'stats.losses': 0,
        'stats.goalsScored': 0,
        'stats.goalsConceded': 0,
        'stats.winRate': 0,
    });
    if (++n % 200 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 200 !== 0) await lot.commit();
if (n > 0) console.log(`  [ok] ${n} compte(s) sans archive remis a zero`);

console.log('\n  Il reste a recalculer les compteurs generaux depuis les parties :');
console.log('    npx tsx scripts/recalculate-all-stats.ts\n');
