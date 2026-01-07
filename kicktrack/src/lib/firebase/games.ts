import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { Game, Goal, GoalPosition, Player, GameResults } from '@/types';

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

    return onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as Game);
        } else {
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
    position: GoalPosition
): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        throw new Error('Game not found');
    }

    const game = gameSnap.data() as Game;

    const goal: Goal = {
        goalId: `goal-${Date.now()}`,
        scorerId,
        scorerName,
        teamIndex,
        position,
        timestamp: new Date()
    };

    const newScore = game.teams[teamIndex].score + 1;

    // Check if game is won
    const isGameWon = newScore >= game.targetScore;

    await updateDoc(gameRef, {
        goals: arrayUnion(goal),
        [`teams.${teamIndex}.score`]: newScore,
        ...(isGameWon ? {
            status: 'completed',
            endedAt: new Date(),
            winnerId: teamIndex.toString()
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
    const newScore = game.teams[lastGoal.teamIndex].score - 1;

    await updateDoc(gameRef, {
        goals: newGoals,
        [`teams.${lastGoal.teamIndex}.score`]: Math.max(0, newScore)
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
    const winnerId = game.teams[0].score > game.teams[1].score ? '0' :
        game.teams[1].score > game.teams[0].score ? '1' : undefined;

    await updateDoc(gameRef, {
        status: 'completed',
        endedAt,
        duration,
        winnerId
    });

    return calculateGameResults({ ...game, endedAt, duration, winnerId, status: 'completed' });
}

// Abandon game (delete from stats)
export async function abandonGame(gameId: string): Promise<void> {
    const db = getFirebaseDb();
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(gameRef, {
        status: 'abandoned'
    });
}

// Calculate game results
function calculateGameResults(game: Game): GameResults {
    // Count goals by player
    const goalsByPlayer: Record<string, number> = {};
    const goalsByPosition: Record<GoalPosition, number> = {
        defense: 0,
        attack1: 0,
        attack2: 0,
        attack3: 0
    };

    for (const goal of game.goals) {
        goalsByPlayer[goal.scorerId] = (goalsByPlayer[goal.scorerId] || 0) + 1;
        goalsByPosition[goal.position]++;
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
