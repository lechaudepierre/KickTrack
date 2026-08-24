import {
    collection,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    onSnapshot,
    Unsubscribe,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getCountFromServer,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth } from './config';
import { scoreFromTeams } from '@/lib/game/score';
import { toMillis } from '@/lib/game/dates';
import { appliquerBut, effetDuBut, rejouerButs, sansLeDernierBut } from '@/lib/game/goalEngine';
import {
    readLadder,
    gamesFieldPath,
    eloFieldPath,
    LADDERS,
    type LadderId,
} from '@/lib/game/ladders';
import { Game, Goal, GoalPosition, GameResults, GoalType } from '@/types';
import type { Equipped } from '@/types/collection';

const GAMES_COLLECTION = 'games';

// Le calcul d'ELO/MVP vit dans src/lib/game/scoring.ts (module pur, testable),
// et son exécution dans POST /api/games/:id/end (chantier 0.4).
// Ce type est ré-exporté ici pour les imports existants.
export type { GameEloChanges } from '@/lib/game/scoring';

// Get game by ID
export async function getGame(gameId: string): Promise<Game | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as Game;
    }
    return null;
}

// Subscribe to game updates (real-time)
export function subscribeToGame(
    gameId: string,
    callback: (game: Game | null) => void
): Unsubscribe {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);

    return onSnapshot(gameRef, {
        next: (doc) => {
            if (doc.exists()) {
                callback(doc.data() as Game);
            } else {
                callback(null);
            }
        },
        error: (error) => {
            console.error('Error in game subscription:', error);
            callback(null);
        }
    });
}

/**
 * Reporte des scores rejoués sur les équipes, sans toucher au reste.
 *
 * Les joueurs, la couleur et le nom d'équipe sont préservés : seul le score
 * est remplacé, et il vient toujours du moteur de buts.
 */
function equipesAvecScores(teams: Game['teams'], scores: [number, number]): Game['teams'] {
    return [
        { ...teams[0], score: scores[0] },
        { ...teams[1], score: scores[1] },
    ];
}

// Add a goal
export async function addGoal(
    gameId: string,
    scorerId: string,
    scorerName: string,
    teamIndex: 0 | 1,
    position: GoalPosition,
    type: GoalType = 'normal'
): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game = gameSnap.data() as Game;
    const butsAvant = game.goals ?? [];

    // L'état d'avant est REJOUÉ depuis les buts, pas relu sur la partie : c'est
    // ce qui garantit qu'ajouter et annuler restent exactement inverses
    // (chantier 9.4). Une partie dont le score aurait dérivé se recale ici.
    const etatAvant = rejouerButs(butsAvant);
    const effet = effetDuBut(etatAvant, { type, position, teamIndex });

    const goal: Goal = {
        id: `goal-${Date.now()}`,
        timestamp: new Date(),
        type,
        position,
        scoredBy: scorerId,
        scorerName,
        teamIndex,
        // Informatif : ce que ce but a rapporté, pour l'afficher dans la
        // timeline sans rejouer la partie. Le score, lui, ne s'en sert plus.
        points: effet.points,
        previousMultiplier: etatAvant.multiplier
    };

    const etatApres = appliquerBut(etatAvant, { type, position, teamIndex });
    const updatedTeams = equipesAvecScores(game.teams, etatApres.scores);

    // Note: Automatic win logic removed here. Game must be ended manually by host.

    await updateDoc(gameRef, {
        goals: arrayUnion(goal),
        teams: updatedTeams,
        // DÉRIVÉ des équipes, jamais reconstruit à la main : c'est ce qui rend
        // une divergence entre les deux copies impossible (chantier 9.1).
        score: scoreFromTeams(updatedTeams),
        multiplier: etatApres.multiplier
    });

    // Note: Stats update removed here. It's now handled by endGame when called manually.
}

// Remove last goal (undo)
export async function removeLastGoal(gameId: string): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game = gameSnap.data() as Game;

    if (!game.goals || game.goals.length === 0) {
        return;
    }

    // On ne soustrait plus le dernier but : on rejoue la partie sans lui.
    // Scores et multiplicateur retombent donc exactement sur l'état d'avant,
    // y compris quand l'ajout avait été borné à zéro (chantier 9.4).
    const newGoals = sansLeDernierBut(game.goals);
    const etat = rejouerButs(newGoals);
    const updatedTeams = equipesAvecScores(game.teams, etat.scores);

    await updateDoc(gameRef, {
        goals: newGoals,
        teams: updatedTeams,
        // DÉRIVÉ des équipes, jamais reconstruit à la main : c'est ce qui rend
        // une divergence entre les deux copies impossible (chantier 9.1).
        score: scoreFromTeams(updatedTeams),
        multiplier: etat.multiplier
    });
}

// End game manually
/**
 * Termine une partie.
 *
 * ⚠️ NE CALCULE PLUS RIEN — délègue à POST /api/games/:id/end (chantier 0.4).
 *
 * Tout le calcul d'ELO, de MVP et l'écriture des stats se font côté serveur
 * avec le SDK admin. Le client ne peut plus écrire `stats` sur qui que ce soit,
 * ce qui referme la faille décrite dans firestore.rules.
 */
export async function endGame(gameId: string): Promise<GameResults> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Vous devez être connecté pour terminer une partie');

    const idToken = await currentUser.getIdToken();

    const response = await fetch(`/api/games/${gameId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Erreur lors de la clôture de la partie');
    }

    return payload as GameResults;
}

// Abandon game (delete from stats)
export async function abandonGame(gameId: string): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(gameRef, {
        status: 'abandoned'
    });
}

// Forfeit game (one team abandons)
export async function forfeitGame(gameId: string, forfeitingTeamIndex: 0 | 1): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) throw new Error('Game not found');
    const game = gameSnap.data() as Game;
    const winningTeamIndex = 1 - forfeitingTeamIndex;
    const symbolicWinScore = Math.max(game.teams[winningTeamIndex].score, 6);

    const updatedTeams = [...game.teams];
    updatedTeams[winningTeamIndex] = {
        ...updatedTeams[winningTeamIndex],
        score: symbolicWinScore
    };

    await updateDoc(gameRef, {
        teams: updatedTeams,
        // Dérivé, comme partout ailleurs. L'ancienne version reprenait
        // `game.score` pour l'équipe perdante : si cette copie avait déjà
        // divergé, le forfait la recopiait telle quelle.
        score: scoreFromTeams(updatedTeams)
    });

    await endGame(gameId);
}

/**
 * Les dernières parties d'un joueur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE (mesuré le 22/08)
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ancienne version demandait TOUTES les parties du joueur, puis appliquait
 * `limitCount` avec un `.slice()` **après le téléchargement**. Le paramètre ne
 * servait donc à rien côté réseau.
 *
 * Chiffres réels de production : ouvrir un profil téléchargeait jusqu'à
 * **892 Ko** de documents de parties — pour en afficher quelques-unes. C'est
 * la cause principale des lenteurs signalées par Sacha.
 *
 * Le commentaire d'origine disait « sans orderBy pour éviter un index
 * composite ». L'index évité coûtait 890 Ko à chaque ouverture de profil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX CHEMINS, ET C'EST VOLONTAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le chemin rapide a besoin d'un index composite (voir `firestore.indexes.json`).
 * Tant qu'il n'existe pas — ou pendant les quelques minutes de sa
 * construction — Firestore répond `failed-precondition`. On retombe alors sur
 * l'ancien comportement : lent, mais correct. Aucune fenêtre de casse.
 *
 * Le repli disparaîtra quand l'index sera en place partout.
 */
export async function getUserGames(userId: string, limitCount: number = 10): Promise<Game[]> {
    const db = getFirebaseDb();

    /** Les parties avec invités sont écartées ici, pas par la requête. */
    const estValable = (game: Game): boolean => {
        if (game.status !== 'completed') return false;
        if (game.isGuestGame) return false;
        // Les parties d'avant le drapeau : on regarde les joueurs.
        return !game.teams?.some(team =>
            team.players?.some(player => player.userId.startsWith('guest_'))
        );
    };


    // ── Chemin rapide : le tri et la coupe se font côté serveur ──────────────
    try {
        // Une marge, pas un doublement : `status == completed` est désormais
        // filtré CÔTÉ SERVEUR, il ne reste que les parties avec invités à
        // écarter ici, et elles sont minoritaires. Doubler la demande revenait
        // à télécharger deux fois trop.
        const marge = Math.min(limitCount + 30, 300);
        const rapide = query(
            collection(db, GAMES_COLLECTION),
            where('playerIds', 'array-contains', userId),
            where('status', '==', 'completed'),
            orderBy('startedAt', 'desc'),
            limit(marge)
        );
        const snap = await getDocs(rapide);
        return snap.docs.map(d => d.data() as Game).filter(estValable).slice(0, limitCount);
    } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code !== 'failed-precondition') throw err;
        console.warn(
            '[getUserGames] index composite absent — repli lent. '
            + 'Créer l\'index décrit dans firestore.indexes.json.'
        );
    }

    // ── Repli : tout télécharger, trier et couper ici ────────────────────────
    const snapshot = await getDocs(query(
        collection(db, GAMES_COLLECTION),
        where('playerIds', 'array-contains', userId)
    ));
    const valables = snapshot.docs.map(doc => doc.data() as Game).filter(estValable);
    valables.sort((a, b) => toMillis(b.startedAt) - toMillis(a.startedAt));
    return valables.slice(0, limitCount);
}

/**
 * La place d'un joueur au classement général.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN COMPTAGE SERVEUR, PAS UN TÉLÉCHARGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * La position, c'est « combien de joueurs ont un meilleur ELO, plus un ». La
 * réponse tient dans un entier : `getCountFromServer` la calcule côté
 * Firestore et ne rapatrie que ce nombre.
 *
 * L'alternative — charger le classement pour y chercher sa ligne — coûterait
 * **225 Ko** (mesuré : 141 documents users, avec leur `eloHistory` dedans).
 * Pour afficher « #21 ». C'est exactement le genre d'appel qui rendait
 * l'application lente.
 *
 * Les deux filtres reprennent EXACTEMENT la définition du classement
 * (`getGlobalLeaderboard`) : seuls les joueurs ayant joué y figurent. Les 27
 * comptes à zéro partie ne doivent pas décaler les places.
 *
 * @returns la place (1 = premier), ou `null` si elle ne peut pas être calculée.
 *          On préfère ne RIEN afficher plutôt qu'une place fausse.
 */
export async function getPlayerRank(elo: number, ladder: LadderId = 'normal'): Promise<number | null> {
    try {
        const db = getFirebaseDb();

        // Sur une échelle SECONDAIRE, une seule inégalité suffit — et c'est un
        // heureux effet de bord du modèle : Firestore exclut d'office les
        // documents où le champ est absent, donc les joueurs qui n'ont jamais
        // touché à cette échelle sortent tout seuls du comptage. Aucun index
        // composite nécessaire.
        const filtres = LADDERS[ladder].primary
            ? [where('stats.elo', '>', elo), where('stats.totalGames', '>', 0)]
            : [where(eloFieldPath(ladder), '>', elo)];

        const snap = await getCountFromServer(query(collection(db, 'users'), ...filtres));
        return snap.data().count + 1;
    } catch (err) {
        const code = (err as { code?: string })?.code;
        // Deux inégalités demandent un index composite. Tant qu'il n'existe
        // pas, on se tait — voir `firestore.indexes.json`.
        if (code === 'failed-precondition') {
            console.warn('[getPlayerRank] index composite absent, place non affichée.');
            return null;
        }
        console.error('[getPlayerRank]', err);
        return null;
    }
}

// Leaderboard stats per player
export interface LeaderboardEntry {
    userId: string;
    username: string;
    wins: number;
    losses: number;
    totalGames: number;
    goalsScored: number;
    winRate: number;
    elo?: number;
    /**
     * Cosmétiques équipés. Portés jusqu'ici volontairement : doc 20 —
     * « `equipped` … c'est ce qu'on lit pour afficher n'importe qui dans un
     * classement ». Sans ça, une bannière gagnée resterait invisible là où
     * elle compte le plus.
     */
    equipped?: Equipped;
    /** @deprecated ancien champ, le temps de la migration (chantier 2.5). */
    bannerId?: string;
    /**
     * Historique d'ELO par jour. Sert à reconstituer le classement d'il y a
     * une semaine pour afficher l'évolution de chaque joueur — la donnée
     * existait déjà, aucune migration n'a été nécessaire.
     */
    history?: Record<string, { date: string; elo?: number }>;
}

// Alias for backwards compatibility
export type VenueLeaderboardEntry = LeaderboardEntry;

// Get leaderboard filtered by venue
export async function getVenueLeaderboard(venueId: string): Promise<VenueLeaderboardEntry[]> {
    const db = getFirebaseDb();

    // ═══════════════════════════════════════════════════════════════════════
    // UNE LECTURE DE PROFILS, PLUS UNE AGRÉGATION DE PARTIES
    // ═══════════════════════════════════════════════════════════════════════
    // L'ancienne version lisait TOUTES les parties terminées du stade pour les
    // additionner à l'affichage. Mesuré en production le 22/08 : **1 055 Ko**
    // pour le stade le plus fréquenté, à chaque ouverture.
    //
    // Les compteurs sont désormais tenus à la fin de chaque partie
    // (`stats.venues`, chantier 9.36). Le classement d'un stade se lit donc
    // avec exactement la même requête que le classement général — et la même
    // page n'a plus qu'un seul jeu de données à charger, quel que soit le
    // filtre choisi.
    const q = query(
        collection(db, 'users'),
        where('stats.totalGames', '>', 0)
    );

    const snapshot = await getDocs(q);

    const leaderboard: VenueLeaderboardEntry[] = [];
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const c = data.stats?.venues?.[venueId];
        // Jamais joué ici : le joueur n'apparaît pas dans ce classement.
        if (!c || !c.games) continue;

        leaderboard.push({
            userId: data.userId,
            username: data.username,
            wins: c.wins ?? 0,
            losses: Math.max(0, (c.games ?? 0) - (c.wins ?? 0)),
            totalGames: c.games ?? 0,
            goalsScored: c.goalsScored ?? 0,
            winRate: c.games > 0 ? (c.wins ?? 0) / c.games : 0,
            elo: data.stats?.elo,
            bannerId: data.bannerId,
            equipped: data.equipped,
        } as VenueLeaderboardEntry);
    }

    leaderboard.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.totalGames - a.totalGames;
    });

    return leaderboard;
}

export async function getFriendsLeaderboard(friendIds: string[], venueId?: string): Promise<LeaderboardEntry[]> {
    if (friendIds.length === 0) return [];

    const db = getFirebaseDb();

    // Si on filtre par stade, on garde la logique d'agrégation car on n'a pas de stats par stade sur l'User
    if (venueId && venueId !== 'all') {
        const q = query(
            collection(db, GAMES_COLLECTION),
            where('status', '==', 'completed'),
            where('venueId', '==', venueId)
        );

        const snapshot = await getDocs(q);
        const games = snapshot.docs.map(doc => doc.data() as Game);
        const playerStats = new Map<string, LeaderboardEntry>();

        for (const game of games) {
            if (game.winner === undefined || game.isGuestGame) continue;
            for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
                const team = game.teams[teamIndex];
                const isWinner = teamIndex === game.winner;
                for (const player of team.players) {
                    if (!friendIds.includes(player.userId) || player.userId.startsWith('guest_')) continue;
                    const existing = playerStats.get(player.userId) || {
                        userId: player.userId, username: player.username,
                        wins: 0, losses: 0, totalGames: 0, goalsScored: 0, winRate: 0
                    };
                    existing.totalGames++;
                    if (isWinner) existing.wins++; else existing.losses++;
                    existing.goalsScored += game.goals.filter(g => g.scoredBy === player.userId).length;
                    existing.winRate = existing.totalGames > 0 ? existing.wins / existing.totalGames : 0;
                    playerStats.set(player.userId, existing);
                }
            }
        }

        const leaderboard = Array.from(playerStats.values());
        if (leaderboard.length > 0) {
            const userIds = leaderboard.map(e => e.userId);
            for (let i = 0; i < userIds.length; i += 30) {
                const batch = userIds.slice(i, i + 30);
                const usersQ = query(collection(db, 'users'), where('userId', 'in', batch));
                const usersSnap = await getDocs(usersQ);
                usersSnap.forEach(d => {
                    const u = d.data();
                    const entry = playerStats.get(d.id);
                    if (entry) {
                        entry.elo = u.stats?.elo || 1000;
                        entry.equipped = u.equipped;
                        entry.bannerId = u.bannerId;
                    }
                });
            }
        }
        return leaderboard.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
    }

    // SINON (Pas de filtre stade) : On query directement les profils des amis
    const users: LeaderboardEntry[] = [];
    for (let i = 0; i < friendIds.length; i += 30) {
        const batch = friendIds.slice(i, i + 30);
        const q = query(collection(db, 'users'), where('userId', 'in', batch));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const u = doc.data();
            users.push({
                userId: u.userId,
                username: u.username,
                wins: u.stats?.wins || 0,
                losses: u.stats?.losses || 0,
                totalGames: u.stats?.totalGames || 0,
                goalsScored: u.stats?.goalsScored || 0,
                winRate: u.stats?.winRate || 0,
                elo: u.stats?.elo || 1000,
                equipped: u.equipped,
                bannerId: u.bannerId
            });
        });
    }

    return users.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
}

// Get global leaderboard from all completed games
/**
 * Le classement d'une échelle donnée — chantier 7.11.
 *
 * Le classement PRINCIPAL se lit dans les champs historiques, les secondaires
 * dans `stats.ladders`. `readLadder` masque la différence, et les chemins de
 * requête viennent de `gamesFieldPath` : ajouter un troisième classement ne
 * demandera pas une ligne ici.
 *
 * Un joueur qui n'a jamais joué sur l'échelle **n'apparaît pas** (décision de
 * Sacha, 22/08). Un classement où cent trente joueurs sont à égalité à 1000
 * n'apprendrait rien.
 */
export async function getGlobalLeaderboard(ladder: LadderId = 'normal'): Promise<LeaderboardEntry[]> {
    const db = getFirebaseDb();

    const q = query(
        collection(db, 'users'),
        where(gamesFieldPath(ladder), '>', 0)
    );

    const snapshot = await getDocs(q);

    const leaderboard: LeaderboardEntry[] = snapshot.docs.map(doc => {
        const userData = doc.data();
        const l = readLadder(userData.stats, ladder);
        return {
            userId: userData.userId,
            username: userData.username,
            wins: l.wins,
            losses: Math.max(0, l.games - l.wins),
            totalGames: l.games,
            // Les buts et l'historique quotidien ne sont tenus que globalement.
            // Sur une échelle secondaire, on n'invente pas une valeur : on
            // affiche zéro plutôt qu'un chiffre qui voudrait dire autre chose.
            goalsScored: ladder === 'normal' ? (userData.stats?.goalsScored || 0) : 0,
            winRate: l.games > 0 ? l.wins / l.games : 0,
            elo: l.elo,
            equipped: userData.equipped,
            bannerId: userData.bannerId,
            history: ladder === 'normal' ? userData.stats?.history : undefined,
        };
    });

    // Tri côté client : Firestore demanderait un index composite pour un
    // `where > 0` suivi d'un `orderBy` sur un autre champ.
    return leaderboard.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
}