import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    onSnapshot,
    Unsubscribe,
    runTransaction,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { updateVenueStats } from './firestore';
import { Game, Goal, GoalPosition, Player, GameResults, GoalType, Team } from '@/types';
import { Firestore } from 'firebase/firestore';

const GAMES_COLLECTION = 'games';

// Helper function to update player stats after a game ends
async function updatePlayerStatsAfterGame(
    db: Firestore,
    teams: Team[],
    goals: Goal[],
    winner: 0 | 1
): Promise<void> {
    // Check if any player is a guest (userId starts with 'guest_')
    const hasGuestPlayers = teams.some(team =>
        team.players.some(player => player.userId.startsWith('guest_'))
    );

    // Don't update stats if there are guest players
    if (hasGuestPlayers) {
        console.log('Skipping stats update - game contains guest players');
        return;
    }

    const goalsByPlayer: Record<string, number> = {};
    goals.forEach(goal => {
        goalsByPlayer[goal.scoredBy] = (goalsByPlayer[goal.scoredBy] || 0) + 1;
    });

    const updatePromises = [];

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
        const team = teams[teamIndex];
        const isWinner = teamIndex === winner;
        const goalsConceded = teams[1 - teamIndex].score;

        for (const player of team.players) {
            const playerRef = doc(db, 'users', player.userId);

            updatePromises.push(runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(playerRef);
                if (!userDoc.exists()) return;

                const userData = userDoc.data();
                const currentStats = userData.stats || {
                    totalGames: 0,
                    wins: 0,
                    losses: 0,
                    goalsScored: 0,
                    goalsConceded: 0,
                    winRate: 0
                };

                const today = new Date().toISOString().split('T')[0];
                const currentHistory = currentStats.history || {};
                const dailyStats = currentHistory[today] || {
                    date: today,
                    gamesPlayed: 0,
                    wins: 0,
                    goalsScored: 0
                };

                const newDailyStats = {
                    date: today,
                    gamesPlayed: dailyStats.gamesPlayed + 1,
                    wins: dailyStats.wins + (isWinner ? 1 : 0),
                    goalsScored: dailyStats.goalsScored + (goalsByPlayer[player.userId] || 0)
                };

                const newStats = {
                    totalGames: currentStats.totalGames + 1,
                    wins: currentStats.wins + (isWinner ? 1 : 0),
                    losses: currentStats.losses + (isWinner ? 0 : 1),
                    goalsScored: currentStats.goalsScored + (goalsByPlayer[player.userId] || 0),
                    goalsConceded: currentStats.goalsConceded + goalsConceded,
                    winRate: 0,
                    history: {
                        ...currentHistory,
                        [today]: newDailyStats
                    }
                };

                newStats.winRate = newStats.totalGames > 0 ? newStats.wins / newStats.totalGames : 0;

                transaction.update(playerRef, { stats: newStats });
            }));
        }
    }

    await Promise.all(updatePromises);
}

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
    const currentMultiplier = game.multiplier || 1;
    const isMidfield = position === 'midfield';
    const isNormal = type === 'normal';
    const isGamelle = type === 'gamelle';
    const isGamelleRentrante = type === 'gamelle_rentrante';

    let points = 0;
    let opponentPointsChange = 0;
    let nextMultiplier = currentMultiplier;

    if (isMidfield) {
        points = 0;
        nextMultiplier = currentMultiplier + 1;
    } else if (isNormal) {
        points = currentMultiplier;
        nextMultiplier = 1;
    } else if (isGamelle) {
        points = 0;
        opponentPointsChange = -1;
    } else if (isGamelleRentrante) {
        points = 1;
        opponentPointsChange = -1;
    } else {
        points = 1;
        nextMultiplier = currentMultiplier;
    }

    const goal: Goal = {
        id: `goal-${Date.now()}`,
        timestamp: new Date(),
        type,
        position,
        scoredBy: scorerId,
        scorerName,
        teamIndex,
        points,
        previousMultiplier: currentMultiplier
    };

    const opponentIndex = 1 - teamIndex;
    const newScore = game.teams[teamIndex].score + points;
    const newOpponentScore = game.teams[opponentIndex].score + opponentPointsChange;
    const targetScore = parseInt(game.gameType);

    // Update local teams array
    const updatedTeams = [...game.teams];
    updatedTeams[teamIndex] = {
        ...updatedTeams[teamIndex],
        score: newScore
    };
    updatedTeams[opponentIndex] = {
        ...updatedTeams[opponentIndex],
        score: newOpponentScore
    };

    // Check if game is won
    const isGameWon = newScore >= targetScore;

    // Calculate duration if game is won
    let duration: number | undefined;
    if (isGameWon) {
        const startedAt = game.startedAt instanceof Date
            ? game.startedAt
            : new Date((game.startedAt as any).seconds * 1000);
        duration = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    }

    await updateDoc(gameRef, {
        goals: arrayUnion(goal),
        teams: updatedTeams,
        score: [
            teamIndex === 0 ? newScore : newOpponentScore,
            teamIndex === 1 ? newScore : newOpponentScore
        ],
        multiplier: nextMultiplier,
        ...(isGameWon ? {
            status: 'completed',
            endedAt: new Date(),
            duration,
            winner: teamIndex
        } : {})
    });

    // If game is won, update player stats and venue stats
    if (isGameWon) {
        await updatePlayerStatsAfterGame(
            db,
            updatedTeams,
            [...game.goals, goal],
            teamIndex
        );

        // Update venue stats
        const totalPlayers = updatedTeams.reduce((sum, team) => sum + team.players.length, 0);
        await updateVenueStats(game.venueId, { playersCount: totalPlayers });
    }
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

    if (game.goals.length === 0) {
        return;
    }

    const lastGoal = game.goals[game.goals.length - 1];
    const newGoals = game.goals.slice(0, -1);

    // We need to undo what was done in addGoal
    // 1. Subtract points from the scorer's team
    // 2. If it was a gamelle, it subtracted 1 from opponent, so we add 1 back
    // Note: This is a bit simplified as it doesn't perfectly restore multiplier state 
    // if we wanted to be 100% accurate, but it handles the scores.

    const teamIndex = lastGoal.teamIndex;
    const opponentIndex = 1 - teamIndex;
    const points = lastGoal.points || 0;
    const isGamelle = lastGoal.type === 'gamelle' || lastGoal.type === 'gamelle_rentrante';
    const opponentPointsChange = isGamelle ? -1 : 0;

    const updatedTeams = [...game.teams];
    const newScore = updatedTeams[teamIndex].score - points;
    const newOpponentScore = updatedTeams[opponentIndex].score - opponentPointsChange;

    updatedTeams[teamIndex] = {
        ...updatedTeams[teamIndex],
        score: newScore
    };
    updatedTeams[opponentIndex] = {
        ...updatedTeams[opponentIndex],
        score: newOpponentScore
    };

    await updateDoc(gameRef, {
        goals: newGoals,
        teams: updatedTeams,
        score: [
            teamIndex === 0 ? newScore : newOpponentScore,
            teamIndex === 1 ? newScore : newOpponentScore
        ],
        multiplier: lastGoal.previousMultiplier || 1
    });
}

// End game manually
export async function endGame(gameId: string): Promise<GameResults> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game = gameSnap.data() as Game;
    const endedAt = new Date();
    const startedAt = game.startedAt instanceof Date ? game.startedAt : new Date(game.startedAt);
    const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Determine winner
    const winner = game.teams[0].score > game.teams[1].score ? 0 :
        game.teams[1].score > game.teams[0].score ? 1 : undefined;

    await updateDoc(gameRef, {
        status: 'completed',
        endedAt,
        duration,
        winner
    });

    // Update player stats if there's a winner
    if (winner !== undefined) {
        await updatePlayerStatsAfterGame(db, game.teams, game.goals, winner);
    }

    // Update venue stats
    const totalPlayers = game.teams.reduce((sum, team) => sum + team.players.length, 0);
    await updateVenueStats(game.venueId, { playersCount: totalPlayers });

    return calculateGameResults({ ...game, status: 'completed', winner });
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
    const targetScore = parseInt(game.gameType);
    const winningTeamIndex = 1 - forfeitingTeamIndex;

    const updatedTeams = [...game.teams];
    updatedTeams[winningTeamIndex] = {
        ...updatedTeams[winningTeamIndex],
        score: targetScore
    };

    await updateDoc(gameRef, {
        teams: updatedTeams,
        score: [
            winningTeamIndex === 0 ? targetScore : game.score[0],
            winningTeamIndex === 1 ? targetScore : game.score[1]
        ]
    });

    await endGame(gameId);
}

// Get user's recent games
export async function getUserGames(userId: string, limitCount: number = 10): Promise<Game[]> {
    const db = getFirebaseDb();

    // Query without orderBy to avoid needing a composite index
    // We'll sort client-side instead
    const q = query(
        collection(db, GAMES_COLLECTION),
        where('playerIds', 'array-contains', userId)
    );

    const snapshot = await getDocs(q);
    const games = snapshot.docs.map(doc => doc.data() as Game);

    // Filter out non-completed games and guest games
    const validGames = games.filter(game => {
        // Only include completed games
        if (game.status !== 'completed') return false;

        // If the flag exists and is true, filter it out
        if (game.isGuestGame) return false;

        // For old games without the flag, check if it contains guest players
        const hasGuestPlayers = game.teams?.some(team =>
            team.players?.some(player => player.userId.startsWith('guest_'))
        );
        return !hasGuestPlayers;
    });

    // Sort by startedAt descending (client-side)
    validGames.sort((a, b) => {
        const dateA = a.startedAt instanceof Date ? a.startedAt : new Date((a.startedAt as any).seconds * 1000);
        const dateB = b.startedAt instanceof Date ? b.startedAt : new Date((b.startedAt as any).seconds * 1000);
        return dateB.getTime() - dateA.getTime();
    });

    // Apply limit
    return validGames.slice(0, limitCount);
}

// Calculate game results
function calculateGameResults(game: Game): GameResults {
    // Count goals by player
    const goalsByPlayer: Record<string, number> = {};
    const goalsByPosition: Record<GoalPosition, number> = {
        defense: 0,
        midfield: 0,
        attack: 0,
        goalkeeper: 0
    };

    for (const goal of game.goals) {
        goalsByPlayer[goal.scoredBy] = (goalsByPlayer[goal.scoredBy] || 0) + 1;
        if (goal.position) {
            goalsByPosition[goal.position]++;
        }
    }

    // Find MVP
    let mvp: Player = game.teams[0].players[0];
    let maxGoals = 0;

    for (const team of game.teams) {
        for (const player of team.players) {
            const goals = goalsByPlayer[player.userId] || 0;
            if (goals > maxGoals) {
                maxGoals = goals;
                mvp = player;
            }
        }
    }

    return {
        game,
        mvp,
        goalsByPlayer,
        goalsByPosition
    };
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
}

// Alias for backwards compatibility
export type VenueLeaderboardEntry = LeaderboardEntry;

// Get leaderboard filtered by venue
export async function getVenueLeaderboard(venueId: string): Promise<VenueLeaderboardEntry[]> {
    const db = getFirebaseDb();

    // Get all completed games at this venue
    const q = query(
        collection(db, GAMES_COLLECTION),
        where('venueId', '==', venueId),
        where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const games = snapshot.docs.map(doc => doc.data() as Game);

    // Calculate stats per player
    const playerStats = new Map<string, VenueLeaderboardEntry>();

    for (const game of games) {
        if (game.winner === undefined) continue; // Skip draws
        if (game.isGuestGame) continue; // Skip guest games

        // For old games without flag, check for guest players
        const hasGuestPlayers = game.teams?.some(team =>
            team.players?.some(player => player.userId.startsWith('guest_'))
        );
        if (hasGuestPlayers) continue;

        for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
            const team = game.teams[teamIndex];
            const isWinner = teamIndex === game.winner;

            for (const player of team.players) {
                // Skip guest players
                if (player.userId.startsWith('guest_')) continue;

                const existing = playerStats.get(player.userId) || {
                    userId: player.userId,
                    username: player.username,
                    wins: 0,
                    losses: 0,
                    totalGames: 0,
                    goalsScored: 0,
                    winRate: 0
                };

                existing.totalGames++;
                if (isWinner) {
                    existing.wins++;
                } else {
                    existing.losses++;
                }

                // Count goals scored by this player in this game
                const playerGoals = game.goals.filter(g => g.scoredBy === player.userId).length;
                existing.goalsScored += playerGoals;

                existing.winRate = existing.totalGames > 0 ? existing.wins / existing.totalGames : 0;

                playerStats.set(player.userId, existing);
            }
        }
    }

    // Convert to array and sort by wins
    const leaderboard = Array.from(playerStats.values());

    // Fetch current usernames to ensure they are up to date
    if (leaderboard.length > 0) {
        const userIds = leaderboard.map(e => e.userId);
        for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            const usersQ = query(collection(db, 'users'), where('userId', 'in', batch));
            const usersSnapshot = await getDocs(usersQ);
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const entry = playerStats.get(doc.id);
                if (entry) {
                    entry.username = userData.username;
                }
            });
        }
    }

    leaderboard.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
    });

    return leaderboard;
}

// Get global leaderboard from all completed games
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
    const db = getFirebaseDb();

    // Get all completed games
    const q = query(
        collection(db, GAMES_COLLECTION),
        where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    const games = snapshot.docs.map(doc => doc.data() as Game);

    // Calculate stats per player
    const playerStats = new Map<string, LeaderboardEntry>();

    for (const game of games) {
        if (game.winner === undefined) continue; // Skip draws
        if (game.isGuestGame) continue; // Skip guest games

        // For old games without flag, check for guest players
        const hasGuestPlayers = game.teams?.some(team =>
            team.players?.some(player => player.userId.startsWith('guest_'))
        );
        if (hasGuestPlayers) continue;

        for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
            const team = game.teams[teamIndex];
            const isWinner = teamIndex === game.winner;

            for (const player of team.players) {
                // Skip guest players
                if (player.userId.startsWith('guest_')) continue;

                const existing = playerStats.get(player.userId) || {
                    userId: player.userId,
                    username: player.username,
                    wins: 0,
                    losses: 0,
                    totalGames: 0,
                    goalsScored: 0,
                    winRate: 0
                };

                existing.totalGames++;
                if (isWinner) {
                    existing.wins++;
                } else {
                    existing.losses++;
                }

                // Count goals scored by this player in this game
                const playerGoals = game.goals.filter(g => g.scoredBy === player.userId).length;
                existing.goalsScored += playerGoals;

                existing.winRate = existing.totalGames > 0 ? existing.wins / existing.totalGames : 0;

                playerStats.set(player.userId, existing);
            }
        }
    }

    // Convert to array and sort by wins
    const leaderboard = Array.from(playerStats.values());

    // Fetch current usernames to ensure they are up to date
    if (leaderboard.length > 0) {
        const userIds = leaderboard.map(e => e.userId);
        for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            const usersQ = query(collection(db, 'users'), where('userId', 'in', batch));
            const usersSnapshot = await getDocs(usersQ);
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const entry = playerStats.get(doc.id);
                if (entry) {
                    entry.username = userData.username;
                }
            });
        }
    }

    leaderboard.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winRate - a.winRate;
    });

    return leaderboard;
}
