/**
 * POST /api/games/:id/end — clôture d'une partie.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE ROUTE EXISTE (chantier 0.4)
 * ═══════════════════════════════════════════════════════════════════════════
 * Avant, la fin de partie était calculée et écrite DANS LE NAVIGATEUR : le
 * client écrivait `stats` (donc l'ELO) sur le document de chaque joueur.
 * Les règles Firestore devaient donc l'autoriser — et n'importe qui pouvait
 * s'attribuer l'ELO de son choix depuis la console du navigateur.
 *
 * Tout le calcul vit désormais ici. Une fois cette route en production, on
 * peut passer `clientMayWriteStats()` à `false` dans firestore.rules
 * (chantier 0.2) et la faille est refermée pour de bon.
 *
 * Le SDK admin contourne les règles par conception : c'est ce qui permet
 * d'écrire les stats de tous les joueurs alors que le client ne le pourra plus.
 */

import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb, requireCallerUid, HttpError } from '@/lib/firebase/admin';
import {
    computeGameEloChanges,
    goalsByPlayer as countGoalsByPlayer,
    isGuestId,
    hasGuestPlayers,
    ELO_BASE,
    type PlayerEloInput,
} from '@/lib/game/scoring';
import type { Game, Team, Goal, GoalPosition } from '@/types/game';
import { grantEarnedPacks } from '@/lib/collection/packs';
import { gameCountsForPacks } from '@/lib/collection/packEarning';
import { getMode } from '@/lib/gamemodes/modes';
import { accumulateVenue } from '@/lib/game/venueStats';
import { readLadder, applyGameToLadder, LADDERS } from '@/lib/game/ladders';

// D7 TRANCHÉ (22/08) : `stats.eloHistory` est SUPPRIMÉ, pas déplacé.
// Il pesait 43 % des 141 profils que le classement télécharge, et personne ne
// le lisait vraiment — le graphique du profil est recalculé depuis les
// parties, et le pic d'ELO tient dans le champ `peakElo`.

function toDate(value: unknown): Date {
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date();
}

/** Convertit récursivement les Timestamp en ISO pour que la réponse soit sérialisable. */
function serialize(value: unknown): unknown {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)])
        );
    }
    return value;
}

function goalsByPosition(goals: Goal[]): Record<GoalPosition, number> {
    const out: Record<GoalPosition, number> = { defense: 0, midfield: 0, attack: 0, goalkeeper: 0 };
    for (const goal of goals) {
        if (goal.position) out[goal.position]++;
    }
    return out;
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const callerUid = await requireCallerUid(request);
        const { id: gameId } = await context.params;
        const db = getAdminDb();
        const gameRef = db.collection('games').doc(gameId);

        const snap = await gameRef.get();
        if (!snap.exists) throw new HttpError(404, 'Partie introuvable');

        const game = snap.data() as Game;
        const teams = game.teams as [Team, Team];

        // ─── Autorisation : seul un participant ou l'hôte peut clore ──────────
        const participants = new Set<string>([
            ...(game.playerIds ?? []),
            ...teams.flatMap(t => t.players.map(p => p.userId)),
        ]);
        if (game.hostId !== callerUid && !participants.has(callerUid)) {
            throw new HttpError(403, 'Seuls les joueurs de la partie peuvent la terminer');
        }

        // ─── Idempotence ──────────────────────────────────────────────────────
        // Une partie déjà terminée renvoie son résultat au lieu d'échouer.
        // Sur une route HTTP, un double-tap ou un renvoi réseau est normal :
        // échouer afficherait une erreur alors que tout s'est bien passé.
        if (game.status === 'completed') {
            return NextResponse.json({
                alreadyCompleted: true,
                ...(buildResults(game, gameId) as Record<string, unknown>),
            });
        }
        if (game.status !== 'in_progress') {
            throw new HttpError(409, 'La partie n\'est pas en cours');
        }

        // ─── Vainqueur ────────────────────────────────────────────────────────
        const winner: 0 | 1 | undefined =
            teams[0].score > teams[1].score ? 0 :
            teams[1].score > teams[0].score ? 1 : undefined;

        if (winner === undefined) {
            throw new HttpError(400, 'Impossible de terminer un match sur une égalité. Continuez de jouer !');
        }

        // ─── Lecture des joueurs (hors invités) ───────────────────────────────
        const realPlayers = teams.flatMap(t => t.players).filter(p => !isGuestId(p.userId));
        const playerInputs: Record<string, PlayerEloInput> = {};
        const previousPeaks: Record<string, number> = {};
        const previousStreaks: Record<string, number> = {};
        const newStreaks: Record<string, number> = {};

        if (!hasGuestPlayers(teams) && realPlayers.length > 0) {
            const refs = realPlayers.map(p => db.collection('users').doc(p.userId));
            const docs = await db.getAll(...refs);
            docs.forEach((doc, i) => {
                const stats = doc.data()?.stats ?? {};
                playerInputs[realPlayers[i].userId] = {
                    userId: realPlayers[i].userId,
                    username: realPlayers[i].username,
                    elo: stats.elo ?? ELO_BASE,
                    gamesPlayed: stats.totalGames ?? 0,
                };
                // Pic d'avant la partie. Seul le serveur peut le connaître :
                // une fois les stats écrites, il est déjà écrasé.
                previousStreaks[realPlayers[i].userId] = stats.winStreak ?? 0;
                // `peakElo` suffit : il est tenu à jour à chaque partie, et il
                // a été reconstitué pour les 140 profils qui ne l'avaient pas
                // avant que `eloHistory` soit supprimé (D7, 22/08).
                previousPeaks[realPlayers[i].userId] = Math.max(
                    stats.peakElo ?? 0,
                    stats.elo ?? ELO_BASE,
                );
            });
        }

        // ─── Calcul (module pur, partagé avec le client) ──────────────────────
        // ─── Le mode décide si la partie compte — chantier 7.10 ──────────────
        // UN SEUL drapeau pour l'ELO et pour les packs : « un mode classé donne
        // de l'ELO et des packs, un mode non classé ne donne ni l'un ni
        // l'autre » (Sacha, 21/08). Deux réglages séparés auraient divergé.
        //
        // Le MVP, lui, reste calculé : c'est une lecture de la partie, pas une
        // récompense. Un joueur qui domine un blitz mérite qu'on le voie.
        // TROIS drapeaux, parce que les trois diffèrent vraiment :
        //   `ladder`        quelle échelle d'ELO la partie alimente (aucune = pas d'ELO)
        //   `rewards`       la partie rapporte-t-elle des packs
        //   `countsInStats` entre-t-elle dans les statistiques générales
        //
        // Le Blitz a un classement sans récompense ni statistiques ; le Bibitif
        // a des statistiques sans classement ni récompense. Un drapeau unique
        // ne pouvait pas exprimer ça.
        //
        // Le MVP reste calculé dans tous les cas : c'est une lecture de la
        // partie, pas une récompense.
        const mode = getMode(game.modeId);

        // ⚠️ UN MATCH DE TOURNOI NE COMPTE PAS POUR L'ELO (Sacha, 23/08).
        //
        // Les affiches y sont imposées par le tirage, pas choisies : on peut
        // tomber sur le meilleur joueur au premier tour. Faire peser ça sur le
        // classement général pénaliserait la participation, exactement ce qu'un
        // tournoi cherche à encourager.
        //
        // Les packs, eux, tombent normalement : la partie a bien été jouée.
        const estTournoi = !!game.tournamentId;
        const ladder = estTournoi ? undefined : mode.ladder;
        const { eloChanges: eloBruts, mvpId } =
            computeGameEloChanges(teams, game.goals ?? [], winner, playerInputs);
        const eloChanges = ladder ? eloBruts : {};
        const perPlayerGoals = countGoalsByPlayer(game.goals ?? []);

        // Record personnel battu ? Marqué sur la partie, donc consultable pour
        // toujours — y compris en rouvrant les résultats des mois plus tard.
        const winnerIds = new Set(teams[winner].players.map(p => p.userId));

        for (const [userId, change] of Object.entries(eloChanges)) {
            const previousPeak = previousPeaks[userId];
            if (previousPeak !== undefined && change.newElo > previousPeak) {
                change.isRecord = true;
            }
            // Série de victoires en cours. Calculée ici parce que la page de
            // résultats n'a pas l'historique du joueur sous la main, et qu'il
            // serait absurde de recharger toutes ses parties pour un compteur.
            const streak = winnerIds.has(userId) ? (previousStreaks[userId] ?? 0) + 1 : 0;
            change.winStreak = streak;
            newStreaks[userId] = streak;
        }

        // ─── Écriture des stats, un transaction par joueur ────────────────────
        // On écrit des DELTAS relus dans la transaction (chantier 1.1) :
        // l'ancienne version écrivait une valeur absolue calculée avant, ce qui
        // faisait perdre une mise à jour si deux parties se terminaient en même temps.
        const today = new Date().toISOString().split('T')[0];
        const nowIso = new Date().toISOString();
        /** Packs tombés pendant cette partie, par joueur. Renvoyé au client. */
        const packsEarned: Record<string, number> = {};

        // ─── Cette partie compte-t-elle pour les packs ? ──────────────────────
        // Protection contre le farm (chantier 4.7) : enchaîner des 1-0 en dix
        // secondes, ou jouer contre des invités inventés, ne doit rien
        // rapporter. La partie compte toujours pour l'ELO et les statistiques —
        // seul l'octroi de packs est concerné.
        // Un mode non classé ne rapporte jamais de pack, quel que soit le score.
        // Le seuil de buts n'a d'ailleurs aucun sens en chrono : un blitz se
        // termine souvent à 3-2.
        const compteurPacks = mode.rewards && gameCountsForPacks({
            winnerScore: winner !== null && winner >= 0 ? teams[winner].score : 0,
            hasGuests: hasGuestPlayers(teams),
            timed: !!mode.timing,
        });

        for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
            const team = teams[teamIndex];
            const isWinner = teamIndex === winner;

            /* ⚠️ `goalsConceded` EST UNE STATISTIQUE INDIVIDUELLE, PAS UN TOTAL
             *
             * Compté au niveau ÉQUIPE : en 2v2, les deux coéquipiers reçoivent
             * chacun les mêmes buts encaissés. C'est VOULU — « les buts
             * encaissés pendant que je jouais » a un sens pour un joueur, et
             * c'est ce qu'on affiche sur son profil.
             *
             * Mais la conséquence doit être connue de quiconque touche à ces
             * chiffres : **toute somme de `goalsConceded` sur plusieurs joueurs
             * compte les buts de 2v2 deux fois.** Un total « buts encaissés
             * cette saison » calculé ainsi serait faux, sans qu'aucune erreur
             * ne le signale.
             *
             * Pour un vrai total, il faut repartir des parties, pas des profils.
             * Chantier 9.7. */
            const goalsConceded = teams[1 - teamIndex].score;

            for (const player of team.players) {
                if (isGuestId(player.userId)) continue;

                const userRef = db.collection('users').doc(player.userId);
                const change = eloChanges[player.userId];

                const packGamesApres = await db.runTransaction(async (tx) => {
                    const userSnap = await tx.get(userRef);
                    if (!userSnap.exists) return null;

                    const stats = userSnap.data()?.stats ?? {};
                    const scored = perPlayerGoals[player.userId] ?? 0;

                    // ─── Le classement alimenté par ce mode ───────────────────
                    // `readLadder` sait lire un profil PAS ENCORE MIGRÉ : il
                    // retombe sur `stats.elo` / `peakElo` / `eloHistory`. La
                    // migration rattrape, elle ne débloque pas.
                    const suivant = ladder && change
                        ? applyGameToLadder(readLadder(stats, ladder), {
                            eloChange: change.eloChange ?? 0,
                            won: isWinner,
                        })
                        : null;

                    // Le classement PRINCIPAL est écrit dans les champs
                    // historiques, les SECONDAIRES dans `stats.ladders`. Aucune
                    // duplication : `eloHistory` monte à 192 entrées sur les
                    // gros joueurs, et la recopier doublerait le poids des
                    // profils — que le classement lit 141 à la fois.
                    const principal = !!ladder && LADDERS[ladder].primary;

                    const ladders = { ...(stats.ladders ?? {}) };
                    if (suivant && ladder && !principal) ladders[ladder] = suivant;

                    const general = principal ? suivant : null;
                    const eloMiroir = general
                        ? { elo: general.elo, peakElo: general.peakElo }
                        : {};

                    // ─── Les statistiques générales ───────────────────────────
                    // Le Blitz n'y entre pas (⚠️ PROVISOIRE, voir `countsInStats`).
                    const packGames = (stats.packGames ?? 0) + (compteurPacks ? 1 : 0);
                    // Parties de la saison : seules les parties CLASSÉES comptent,
                    // puisque c'est le classement qu'il s'agit d'établir. Un
                    // bibitif ou un chrono ne rapproche pas de la fin du placement.
                    const seasonGames = (stats.seasonGames ?? 0) + (ladder ? 1 : 0);

                    if (!mode.countsInStats) {
                        tx.update(userRef, {
                            stats: { ...stats, ...eloMiroir, packGames, seasonGames, ladders },
                        });
                        return packGames;
                    }

                    const history = stats.history ?? {};
                    const daily = history[today] ?? { date: today, gamesPlayed: 0, wins: 0, goalsScored: 0 };
                    const totalGames = (stats.totalGames ?? 0) + 1;
                    const wins = (stats.wins ?? 0) + (isWinner ? 1 : 0);
                    const eloAffiche = general ? general.elo : (stats.elo ?? ELO_BASE);

                    tx.update(userRef, {
                        stats: {
                            ...stats,
                            ...eloMiroir,
                            ladders,
                            totalGames,
                            wins,
                            losses: (stats.losses ?? 0) + (isWinner ? 0 : 1),
                            goalsScored: (stats.goalsScored ?? 0) + scored,
                            goalsConceded: (stats.goalsConceded ?? 0) + goalsConceded,
                            winRate: totalGames > 0 ? wins / totalGames : 0,
                            packGames,
                            seasonGames,
                            // Compteurs par stade — chantier 9.36. Tenus ici
                            // plutôt que recalculés à chaque affichage.
                            venues: accumulateVenue(stats.venues, game.venueId, {
                                won: isWinner,
                                goalsScored: scored,
                            }),
                            // Remise à zéro sur une défaite : c'est ce qui fait
                            // qu'une série veut dire quelque chose.
                            winStreak: newStreaks[player.userId] ?? (isWinner ? (stats.winStreak ?? 0) + 1 : 0),
                            mvpCount: (stats.mvpCount ?? 0) + (player.userId === mvpId ? 1 : 0),
                            history: {
                                ...history,
                                [today]: {
                                    date: today,
                                    gamesPlayed: daily.gamesPlayed + 1,
                                    wins: daily.wins + (isWinner ? 1 : 0),
                                    goalsScored: daily.goalsScored + scored,
                                    elo: eloAffiche,
                                },
                            },
                        },
                    });

                    return packGames;
                });

                // ─── Packs gagnés — chantier 4.7 ─────────────────────────────
                // Après la transaction de stats, pas dedans : `totalGames` doit
                // être celui d'APRÈS la partie, et l'octroi a sa propre
                // transaction. Ne lève jamais : un pack manqué se rattrape à la
                // partie suivante, puisque le calcul dérive du total.
                if (packGamesApres !== null) {
                    const packs = await grantEarnedPacks(db, player.userId, packGamesApres);
                    if (packs.created.length > 0) packsEarned[player.userId] = packs.created.length;
                }
            }
        }

        // ─── Écriture de la partie ────────────────────────────────────────────
        const endedAt = new Date();
        const duration = Math.floor((endedAt.getTime() - toDate(game.startedAt).getTime()) / 1000);

        await gameRef.update({
            status: 'completed',
            endedAt,
            duration,
            winner,
            ...(Object.keys(eloChanges).length > 0 ? { eloChanges } : {}),
            ...(mvpId ? { mvpId } : {}),
            // Écrit sur la PARTIE, pas seulement renvoyé : la page de résultats
            // relit la partie en temps réel et doit pouvoir l'afficher encore
            // après un rafraîchissement.
            ...(Object.keys(packsEarned).length > 0 ? { packsEarned } : {}),
        });

        // ─── Stats du lieu — jamais bloquantes ────────────────────────────────
        // Corrigé ici : `venues/none` n'existe pas, mais des parties portent
        // `venueId: 'none'` (vérifié en base). L'ancien code faisait un
        // updateDoc dessus, qui échouait et faisait remonter une erreur au
        // joueur ALORS QUE la partie était correctement enregistrée.
        if (game.venueId && game.venueId !== 'none') {
            try {
                await db.collection('venues').doc(game.venueId).update({
                    'stats.totalGames': FieldValue.increment(1),
                    'stats.lastGameAt': endedAt,
                });
            } catch (err) {
                console.error(`[end] stats du lieu ${game.venueId} non mises à jour :`, err);
            }
        }

        const finalGame: Game = {
            ...game,
            status: 'completed',
            winner,
            endedAt,
            duration,
            eloChanges,
            ...(mvpId ? { mvpId } : {}),
        } as Game;

        return NextResponse.json({ ...buildResults(finalGame, gameId) as object, packsEarned });
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error('[POST /api/games/:id/end]', err);
        return NextResponse.json({ error: 'Erreur lors de la clôture de la partie' }, { status: 500 });
    }
}

function buildResults(game: Game, gameId: string) {
    const teams = game.teams as [Team, Team];
    const allPlayers = teams.flatMap(t => t.players);
    // Le MVP vient de `game.mvpId`, seule définition (chantier 1.2).
    const mvp = allPlayers.find(p => p.userId === game.mvpId) ?? allPlayers[0];

    return serialize({
        game: { ...game, gameId },
        mvp,
        mvpId: game.mvpId ?? null,
        goalsByPlayer: countGoalsByPlayer(game.goals ?? []),
        goalsByPosition: goalsByPosition(game.goals ?? []),
    });
}
