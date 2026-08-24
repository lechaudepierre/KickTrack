/**
 * Script de migration : recalcule les stats de tous les joueurs depuis l'historique complet des parties.
 *
 * Ce script remplace les stats pré-calculées (totalGames, wins, losses, goalsScored,
 * goalsConceded, winRate) par un recalcul depuis la collection `games`.
 * L'ELO et eloHistory ne sont PAS modifiés (calculés à la volée pendant les parties).
 *
 * Usage :
 * npx ts-node --project tsconfig.scripts.json scripts/recalculate-all-stats.ts
 * ou (si firebase-admin est dispo) :
 * npx tsx scripts/recalculate-all-stats.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// ─── Init Firebase Admin ──────────────────────────────────────────────────────
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('[echec] serviceAccountKey.json introuvable à la racine du projet.');
    console.error(' Télécharge-le depuis Firebase Console > Project Settings > Service Accounts');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

// ─── Types locaux ─────────────────────────────────────────────────────────────
interface PlayerStats {
    totalGames: number;
    wins: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    winRate: number;
    // ELO fields kept as-is
    elo?: number;
    eloHistory?: unknown[];
    history?: Record<string, unknown>;
}

interface GoalData {
    scoredBy: string;
    teamIndex: number;
}

interface TeamData {
    score: number;
    players: { userId: string; username: string }[];
}

interface GameData {
    status: string;
    isGuestGame?: boolean;
    winner?: number;
    teams: TeamData[];
    goals?: GoalData[];
    playerIds?: string[];
}

// ─── Logic ────────────────────────────────────────────────────────────────────

async function main() {
    console.log(' Chargement de toutes les parties complétées...');

    const gamesSnap = await db
        .collection('games')
        .where('status', '==', 'completed')
        .get();

    console.log(` ${gamesSnap.size} parties trouvées.`);

    // Accumulate stats per userId
    const statsMap: Record<string, {
        totalGames: number;
        wins: number;
        losses: number;
        goalsScored: number;
        goalsConceded: number;
    }> = {};

    const ensure = (userId: string) => {
        if (!statsMap[userId]) {
            statsMap[userId] = { totalGames: 0, wins: 0, losses: 0, goalsScored: 0, goalsConceded: 0 };
        }
    };

    let skipped = 0;
    for (const gameDoc of gamesSnap.docs) {
        const game = gameDoc.data() as GameData;

        // Skip guest games
        if (game.isGuestGame) { skipped++; continue; }
        const hasGuest = game.teams?.some(t => t.players?.some(p => p.userId?.startsWith('guest_')));
        if (hasGuest) { skipped++; continue; }

        // Must have a clear winner
        if (game.winner === undefined || game.winner === null) { skipped++; continue; }

        const goals: GoalData[] = game.goals || [];
        const goalsByPlayer: Record<string, number> = {};
        goals.forEach(g => {
            goalsByPlayer[g.scoredBy] = (goalsByPlayer[g.scoredBy] || 0) + 1;
        });

        for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
            const team = game.teams[teamIndex];
            const isWinner = teamIndex === game.winner;
            const opponentTeam = game.teams[1 - teamIndex];
            const goalsConceded = opponentTeam?.score ?? 0;

            for (const player of team.players ?? []) {
                if (!player.userId || player.userId.startsWith('guest_')) continue;
                ensure(player.userId);
                const s = statsMap[player.userId];
                s.totalGames++;
                if (isWinner) s.wins++; else s.losses++;
                s.goalsScored += goalsByPlayer[player.userId] || 0;
                s.goalsConceded += goalsConceded;
            }
        }
    }

    console.log(` ${skipped} parties ignorées (guests / pas de winner).`);
    console.log(` ${Object.keys(statsMap).length} joueurs à mettre à jour.`);

    // Now update each user in Firestore
    const batch = db.batch();
    let count = 0;

    for (const [userId, computed] of Object.entries(statsMap)) {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            console.warn(` ⚠️ User ${userId} introuvable dans Firestore, ignoré.`);
            continue;
        }

        const existing = userSnap.data() as { stats?: PlayerStats };
        const currentStats = existing.stats || {};

        const newStats = {
            ...currentStats,
            totalGames: computed.totalGames,
            wins: computed.wins,
            losses: computed.losses,
            goalsScored: computed.goalsScored,
            goalsConceded: computed.goalsConceded,
            winRate: computed.totalGames > 0 ? computed.wins / computed.totalGames : 0,
            // ELO and history untouched
        };

        batch.update(userRef, { stats: newStats });
        count++;

        if (count % 400 === 0) {
            // Firestore batch limit is 500 — commit and start a new one
            await batch.commit();
            console.log(` [ok] ${count} users mis à jour...`);
        }
    }

    // Commit remaining
    if (count % 400 !== 0) {
        await batch.commit();
    }

    console.log(`\n[ok] Migration terminée. ${count} joueurs mis à jour.`);
}

main().catch(err => {
    console.error('[echec] Erreur :', err);
    process.exit(1);
});
