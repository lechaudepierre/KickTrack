/**
 * Écritures d'état du chronomètre — chantier 7.10.
 *
 * L'état vit sur le document de la partie, pas dans un navigateur : c'est ce
 * qui permet à tous les appareils de calculer la même seconde, et de retrouver
 * la situation exacte après un rafraîchissement.
 *
 * Toutes les écritures sont TRANSACTIONNELLES et vérifient l'état de départ.
 * Plusieurs téléphones voient le chronomètre atteindre zéro en même temps :
 * sans transaction, deux d'entre eux accorderaient chacun leur prolongation et
 * le match durerait deux fois plus longtemps que prévu.
 */

'use client';

import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { Game } from '@/types/game';

const GAMES = 'games';

/**
 * Accorde une prolongation.
 *
 * @param expectedPeriods prolongations déjà accordées, telles que l'appelant
 *        les a vues. Si la valeur a changé entre-temps, quelqu'un d'autre a
 *        déjà accordé la sienne et on ne fait rien.
 */
export async function grantExtraTime(gameId: string, expectedPeriods: number): Promise<void> {
    const db = getFirebaseDb();
    const ref = doc(db, GAMES, gameId);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;

        const game = snap.data() as Game;
        const chrono = game.chrono ?? {};
        if ((chrono.extraPeriods ?? 0) !== expectedPeriods) return;

        tx.update(ref, {
            'chrono.extraPeriods': expectedPeriods + 1,
            // Figé à la PREMIÈRE prolongation seulement : les buts marqués
            // ensuite ne doivent plus rallonger le chronomètre, sinon une
            // égalité s'entretient sans fin.
            'chrono.goalCountAtOvertime': chrono.goalCountAtOvertime ?? (game.goals?.length ?? 0),
        });
    });
}

/** Passe la partie en but en or : le prochain but termine tout. */
export async function startGoldenGoal(gameId: string): Promise<void> {
    const db = getFirebaseDb();
    const ref = doc(db, GAMES, gameId);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        if ((snap.data() as Game).chrono?.goldenGoal) return;
        tx.update(ref, { 'chrono.goldenGoal': true });
    });
}

/** Met en pause ou reprend. Le temps passé en pause ne consomme pas de chrono. */
export async function setPaused(gameId: string, paused: boolean): Promise<void> {
    const db = getFirebaseDb();
    const ref = doc(db, GAMES, gameId);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;

        const chrono = (snap.data() as Game).chrono ?? {};
        const pausedAt = chrono.pausedAt as unknown as Timestamp | null | undefined;

        if (paused) {
            if (pausedAt) return;   // déjà en pause
            tx.update(ref, { 'chrono.pausedAt': Timestamp.now() });
            return;
        }

        if (!pausedAt) return;      // déjà en cours
        const duree = Date.now() - pausedAt.toMillis();
        tx.update(ref, {
            'chrono.pausedAt': null,
            'chrono.pausedTotalMs': (chrono.pausedTotalMs ?? 0) + Math.max(0, duree),
        });
    });
}
