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
    orderBy,
    getDocs,
    limit
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { Game, Goal, GoalPosition, Player, GameResults, GoalType } from '@/types';

const GAMES_COLLECTION = 'games';

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
            winner: teamIndex
        } : {})
    });
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

    // Update player stats
    if (winner !== undefined) {
        const goalsByPlayer: Record<string, number> = {};
        game.goals.forEach(goal => {
            goalsByPlayer[goal.scoredBy] = (goalsByPlayer[goal.scoredBy] || 0) + (goal.points || 0);
        });

        const updatePromises = [];

        for (let teamIndex = 0; teamIndex < game.teams.length; teamIndex++) {
            const team = game.teams[teamIndex];
            const isWinner = teamIndex === winner;
            const goalsConceded = game.teams[1 - teamIndex].score;

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

    // Try to query by playerIds if available, otherwise fallback (or just try playerIds first)
    // Since we just added playerIds, old games won't have it.
    // But for new games it will work.
    // For now let's try querying by playerIds.

    const q = query(
        collection(db, GAMES_COLLECTION),
        where('playerIds', 'array-contains', userId),
        orderBy('startedAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Game);
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
