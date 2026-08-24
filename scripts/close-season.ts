/**
 * CLÔTURE D'UNE SAISON — exécution.
 *
 * Ce script ne DÉCIDE rien : tout est décrit dans `scripts/season.config.mjs`,
 * et la logique vit dans `src/lib/game/seasonClosure.ts`, couvert par 28 tests.
 * Ici, on lit, on vérifie, on affiche, et on écrit.
 *
 *   npm run season:close              contrôle à blanc, rien n'est écrit
 *   npm run season:close -- --apply   demande une confirmation à taper
 *
 * L'ORDRE DES ÉTAPES N'EST PAS NÉGOCIABLE :
 *   1. valider la configuration contre le catalogue ;
 *   2. figer le classement (instantané) ;
 *   3. distribuer les récompenses ;
 *   4. archiver la saison sur chaque profil ;
 *   5. SEULEMENT ENSUITE, comprimer l'ELO et remettre les compteurs à zéro.
 *
 * Comprimer avant de distribuer reviendrait à récompenser un classement déjà
 * effacé.
 */

import * as readline from 'node:readline/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { SEASON } from './season.config.mjs';
import {
    buildClosurePlan,
    validateConfig,
    summarize,
    ORDRE_GRADES,
    type FinalStanding,
    type SeasonCloseConfig,
} from '../src/lib/game/seasonClosure';
import { getRankInfo } from '../src/lib/utils/rankUtils';

const APPLY = process.argv.includes('--apply');
const config = SEASON as unknown as SeasonCloseConfig & { confirmation: string };

initializeApp({ credential: cert(JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))) });
const db = getFirestore();

const ligne = (t = '') => console.log(t);
const titre = (t: string) => { ligne(); ligne(`─── ${t} ${'─'.repeat(Math.max(0, 68 - t.length))}`); };


/* `tsx` compile ce fichier en CommonJS, où le `await` de premier niveau
   n'existe pas. Tout passe donc dans une fonction. */
async function main() {
    ligne();
    ligne('═'.repeat(74));
    ligne(`  CLÔTURE — ${config.from.label} → ${config.to.label}`);
    ligne(`  Mode : ${APPLY ? '[ECRITURE REELLE EN PRODUCTION]' : '[CONTROLE A BLANC — rien ne sera écrit]'}`);
    ligne('═'.repeat(74));

    // ─── 1. Valider la configuration ─────────────────────────────────────────
    titre('1. Configuration');
    const catalogSnap = await db.collection('catalog').get();
    const erreurs = validateConfig(config, catalogSnap.docs.map(d => d.id));
    if (erreurs.length > 0) {
        ligne('  REFUS — la configuration est incomplète :');
        for (const e of erreurs) ligne(`    • ${e}`);
        ligne();
        ligne('  Une clôture qui s\'arrête au milieu laisse la moitié des joueurs');
        ligne('  récompensés et l\'autre non. Mieux vaut ne pas démarrer.');
        ligne();
        process.exit(1);
    }
    ligne(`  ${catalogSnap.size} items au catalogue, tous les identifiants cités existent.`);
    ligne(`  ELO : ${config.elo.mode}${config.elo.k !== undefined ? ` (k = ${config.elo.k})` : ''}`);
    ligne(`  Placement : ${config.placementGames} parties`);

    // ─── 2. Construire le classement final ───────────────────────────────────
    titre('2. Classement final');
    const usersSnap = await db.collection('users').get();

    /*
     * L'état de chaque profil AVANT qu'on y touche.
     *
     * C'est ce qui rend la clôture annulable. `rollback-season.mjs` relit ces
     * valeurs pour les remettre en place — sans elles, la compression de l'ELO
     * serait définitive, et Sacha a demandé explicitement de pouvoir « tester
     * la mise en saison et dans les dix minutes revenir en arrière ».
     */
    const avantParJoueur = new Map<string, Record<string, unknown>>();

    const standings: FinalStanding[] = usersSnap.docs
        .map(d => {
            const u = d.data();
            const st = u.stats ?? {};
            avantParJoueur.set(d.id, {
                elo: st.elo ?? 1000,
                peakElo: st.peakElo ?? null,
                seasonGames: st.seasonGames ?? null,
                seasonId: st.seasonId ?? null,
                playedPreviousSeason: st.playedPreviousSeason ?? null,
            });
            const games = st.totalGames ?? 0;
            const peak = Math.max(st.peakElo ?? 0, st.elo ?? 1000);
            return {
                userId: d.id,
                username: u.username ?? '(sans pseudo)',
                rank: 0,
                elo: st.elo ?? 1000,
                // Le MEILLEUR grade atteint, pas celui de fin.
                peakGrade: getRankInfo(peak).rank,
                games,
            };
        })
        .filter(s => s.games > 0)
        .sort((a, b) => b.elo - a.elo)
        .map((s, i) => ({ ...s, rank: i + 1 }));

    ligne(`  ${standings.length} joueurs classés sur ${usersSnap.size} comptes.`);
    for (const s of standings.slice(0, 3)) {
        ligne(`    ${String(s.rank).padStart(2)}. ${s.username.padEnd(24)} ${s.elo} ELO  (pic : ${s.peakGrade})`);
    }

    // ─── 3. Le plan ──────────────────────────────────────────────────────────
    titre('3. Ce qui sera distribué');
    const plan = buildClosurePlan(standings, config);
    const bilan = summarize(plan);

    ligne(`  ${bilan.octrois} octrois pour ${bilan.joueurs} joueurs.`);
    if (bilan.sansRecompense > 0) ligne(`  ${bilan.sansRecompense} joueur(s) ne reçoivent rien.`);
    ligne();
    for (const [id, n] of bilan.parItem) {
        ligne(`    ${id.padEnd(26)} ${String(n).padStart(4)} joueur(s)`);
    }

    titre('4. Effet sur l\'ELO');
    ligne('  ⚠️ Cette étape n\'est PAS réversible.');
    ligne();
    for (const p of plan.slice(0, 5)) {
        const d = p.eloAfter - p.eloBefore;
        ligne(`    ${String(p.rank).padStart(2)}. ${p.username.padEnd(24)} ${p.eloBefore} → ${p.eloAfter}  (${d >= 0 ? '+' : ''}${d})`);
    }
    if (plan.length > 5) {
        const dernier = plan[plan.length - 1];
        ligne(`    …`);
        ligne(`    ${String(dernier.rank).padStart(2)}. ${dernier.username.padEnd(24)} ${dernier.eloBefore} → ${dernier.eloAfter}`);
    }

    if (!APPLY) {
        ligne();
        ligne('  Rien n\'a été écrit. Pour exécuter :');
        ligne('    npm run season:close -- --apply');
        ligne();
        process.exit(0);
    }

    // ─── La confirmation ─────────────────────────────────────────────────────
    titre('CONFIRMATION');
    ligne('  Vous êtes sur le point de :');
    ligne(`    • distribuer ${bilan.octrois} récompenses à ${bilan.joueurs} joueurs ;`);
    ligne(`    • MODIFIER L'ELO de ${plan.length} joueurs, de façon irréversible ;`);
    ligne(`    • ouvrir ${config.to.label} et remettre les compteurs de saison à zéro.`);
    ligne();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const saisie = await rl.question(`  Tapez exactement « ${config.confirmation} » pour continuer : `);
    rl.close();

    if (saisie.trim() !== config.confirmation) {
        ligne();
        ligne('  Annulé. Rien n\'a été écrit.');
        ligne();
        process.exit(1);
    }

    // ─── L'exécution ─────────────────────────────────────────────────────────
    const sourceRef = `${config.from.id}_close`;
    const now = Timestamp.now();

    titre('Écriture');

    // 2. L'instantané, AVANT toute modification.
    let lot = db.batch();
    const seasonRef = db.collection('seasons').doc(config.from.id);
    lot.set(seasonRef, {
        id: config.from.id, label: config.from.label,
        status: 'closed', closedAt: now,
        eloReset: config.elo, placementGames: config.placementGames,
    }, { merge: true });
    for (const s of standings) {
        lot.set(seasonRef.collection('standings').doc(s.userId), {
            userId: s.userId, username: s.username, rank: s.rank,
            elo: s.elo, peakGrade: s.peakGrade, games: s.games,
        });
    }
    await lot.commit();
    ligne(`  [ok] Classement figé : ${standings.length} lignes dans seasons/${config.from.id}/standings`);

    // 3. Les récompenses.
    const { grantItem } = await import('../src/lib/collection/grant');
    let octroyes = 0;
    for (const p of plan) {
        for (const itemId of p.items) {
            await grantItem(db, { userId: p.userId, itemId, source: 'saison', sourceRef });
            octroyes++;
        }
    }
    ligne(`  [ok] ${octroyes} récompense(s) octroyée(s), sourceRef « ${sourceRef} »`);

    // 4 et 5. Archive, compression, remise à zéro.
    lot = db.batch();
    let n = 0;
    for (const p of plan) {
        const userRef = db.collection('users').doc(p.userId);
        lot.set(userRef.collection('seasons').doc(config.from.id), {
            seasonId: config.from.id, label: config.from.label,
            rank: p.rank, elo: p.eloBefore, peakGrade: p.peakGrade,
            games: p.games, items: p.items, closedAt: now,
            // Tout ce qu'il faut pour défaire exactement ce qui suit.
            avant: avantParJoueur.get(p.userId) ?? null,
        });
        lot.update(userRef, {
            'stats.elo': p.eloAfter,
            'stats.peakElo': p.eloAfter,
            'stats.seasonGames': 0,
            'stats.seasonId': config.to.id,
            'stats.playedPreviousSeason': true,
        });
        if (++n % 200 === 0) { await lot.commit(); lot = db.batch(); }
    }
    if (n % 200 !== 0) await lot.commit();
    ligne(`  [ok] ${plan.length} profil(s) archivés, ELO comprimé, compteurs remis à zéro`);

    // 6. La nouvelle saison.
    await db.collection('seasons').doc(config.to.id).set({
        id: config.to.id, label: config.to.label,
        status: 'active', startedAt: now,
        placementGames: config.placementGames,
    }, { merge: true });
    ligne(`  [ok] ${config.to.label} ouverte`);

    ligne();
    ligne('═'.repeat(74));
    ligne(`  Clôture terminée. Pour tout annuler, ELO COMPRIS :`);
    ligne(`    node scripts/rollback-season.mjs ${config.from.id} --apply`);
    ligne(`  Pour n'annuler que les récompenses :`);
    ligne(`    node scripts/revoke-season.mjs ${sourceRef} --apply`);
    ligne('═'.repeat(74));
    ligne();

}

main().catch(err => {
    console.error('\n  ÉCHEC :', err instanceof Error ? err.message : err);
    console.error('  Rien de plus n\'a été écrit.\n');
    process.exit(1);
});
