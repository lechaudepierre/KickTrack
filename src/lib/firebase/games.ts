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
    getDocs,
    limit
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { updateVenueStats } from './firestore';
import { Game, Goal, GoalPosition, Player, GameResults, GoalType, Team } from '@/types';
import { Firestore } from 'firebase/firestore';

const GAMES_COLLECTION = 'games';

// Elo calculation helpers

// K-Factor: 64 for first 10 games (placement), 32 afterwards (standard)
function getKFactor(gamesPlayed: number): number {
    if (gamesPlayed < 10) return 64;
    return 32;
}

// Calculate expected probability of winning based on Elo difference
function calculateProbability(rating1: number, rating2: number): number {
    return 1.0 / (1.0 + Math.pow(10, (rating2 - rating1) / 400.0));
}

interface EloUpdate {
    newElo: number;
    eloChange: number;
}

// Calculate new Elo for a player in a 2v2 match
function calculateEloChange(
    playerElo: number,
    partnerElo: number,
    opponentAvgElo: number,
    result: number, // 1 for win, 0 for loss
    gamesPlayed: number
): EloUpdate {
    // 1. Team Probability (50% weight)
    // Based on the average of the team vs average of opponents
    const teamAvgElo = (playerElo + partnerElo) / 2;
    const teamProb = calculateProbability(teamAvgElo, opponentAvgElo);

    // 2. Personal Probability (50% weight)
    // Based on the player's own rating vs average of opponents
    const personalProb = calculateProbability(playerElo, opponentAvgElo);

    // 3. Combined Probability
    // We average the two probabilities to account for both team strength and individual contribution
    const finalProb = (teamProb + personalProb) / 2;

    // 4. K-Factor
    const kFactor = getKFactor(gamesPlayed);

    // 5. Calculate Change
    const change = Math.round(kFactor * (result - finalProb));

    return {
        newElo: playerElo + change,
        eloChange: change
    };
}

// Helper function to update player stats after a game ends
// Elo changes stored on the game document for display
export interface GameEloChanges {
    [userId: string]: {
        previousElo: number;
        newElo: number;
        eloChange: number;
        username: string;
    };
}

async function updatePlayerStatsAfterGame(
    db: Firestore,
    teams: Team[],
    goals: Goal[],
    winner: 0 | 1,
    format?: string // '1v1' or '2v2'
): Promise<GameEloChanges> {
    // Check if any player is a guest (userId starts with 'guest_')
    const hasGuestPlayers = teams.some(team =>
        team.players.some(player => player.userId.startsWith('guest_'))
    );

    // Don't update stats if there are guest players
    if (hasGuestPlayers) {
        console.log('Skipping stats update - game contains guest players');
        return {};
    }

    const goalsByPlayer: Record<string, number> = {};
    goals.forEach(goal => {
        goalsByPlayer[goal.scoredBy] = (goalsByPlayer[goal.scoredBy] || 0) + 1;
    });

    // Pre-fetch user data to get current Elo ratings
    // We fetch for both 1v1 and 2v2 to handle Elo updates
    const playerUserData: Record<string, any> = {};

    for (const team of teams) {
        for (const player of team.players) {
            const userDoc = await getDoc(doc(db, 'users', player.userId));
            if (userDoc.exists()) {
                playerUserData[player.userId] = userDoc.data();
            }
        }
    }

    const updatePromises = [];
    const allEloChanges: GameEloChanges = {};

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
        const team = teams[teamIndex];
        const isWinner = teamIndex === winner;
        const goalsConceded = teams[1 - teamIndex].score;
        const opponentTeam = teams[1 - teamIndex];

        // Prepare Elo calculations for this team if 2v2
        let eloUpdates: Record<string, EloUpdate> = {};

        if (format === '2v2' && team.players.length === 2 && opponentTeam.players.length === 2) {
            // Calculate opponent average Elo
            let opponentEloSum = 0;
            let opponentCount = 0;

            for (const oppPlayer of opponentTeam.players) {
                const oppData = playerUserData[oppPlayer.userId];
                // Default to 1000 if no Elo found
                opponentEloSum += (oppData?.stats?.elo || 1000);
                opponentCount++;
            }
            const opponentAvgElo = opponentCount > 0 ? opponentEloSum / opponentCount : 1000;

            // Calculate Elo update for each player in the current team
            for (const player of team.players) {
                const partner = team.players.find(p => p.userId !== player.userId);
                if (partner) {
                    const playerData = playerUserData[player.userId];
                    const partnerData = playerUserData[partner.userId];

                    const playerElo = playerData?.stats?.elo || 1000;
                    const partnerElo = partnerData?.stats?.elo || 1000;
                    // For games played, we use totals from stats (or 0 if new)
                    // Note: This logic assumes 'totalGames' is accurate for 2v2 context mostly, 
                    // or essentially captures experience level.
                    const gamesPlayed = playerData?.stats?.totalGames || 0;

                    eloUpdates[player.userId] = calculateEloChange(
                        playerElo,
                        partnerElo,
                        opponentAvgElo,
                        isWinner ? 1 : 0,
                        gamesPlayed
                    );
                }
            }
        } else if (format === '1v1' && team.players.length === 1 && opponentTeam.players.length === 1) {
            const player = team.players[0];
            const opponent = opponentTeam.players[0];

            const playerData = playerUserData[player.userId];
            const opponentData = playerUserData[opponent.userId];

            const playerElo = playerData?.stats?.elo || 1000;
            const opponentElo = opponentData?.stats?.elo || 1000;
            const gamesPlayed = playerData?.stats?.totalGames || 0;

            // Standard Elo formula for 1v1
            // We reuse calculateProbability helper
            const prob = calculateProbability(playerElo, opponentElo);
            const kFactor = getKFactor(gamesPlayed);
            const change = Math.round(kFactor * ((isWinner ? 1 : 0) - prob));

            eloUpdates[player.userId] = {
                newElo: playerElo + change,
                eloChange: change
            };
        }

        // Collect Elo changes for display on results page
        for (const player of team.players) {
            if (eloUpdates[player.userId]) {
                const playerData = playerUserData[player.userId];
                const previousElo = playerData?.stats?.elo || 1000;
                allEloChanges[player.userId] = {
                    previousElo,
                    newElo: eloUpdates[player.userId].newElo,
                    eloChange: eloUpdates[player.userId].eloChange,
                    username: player.username
                };
            }
        }

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
                    winRate: 0,
                    elo: 1000
                };

                const today = new Date().toISOString().split('T')[0];
                const currentHistory = currentStats.history || {};
                const dailyStats = currentHistory[today] || {
                    date: today,
                    gamesPlayed: 0,
                    wins: 0,
                    goalsScored: 0
                };

                // Determine new Elo
                let newElo = currentStats.elo || 1000;
                let eloHistory = currentStats.eloHistory || [];

                // Only apply Elo update if calculated (meaning it was 2v2)
                if (eloUpdates[player.userId]) {
                    newElo = eloUpdates[player.userId].newElo;

                    // Add to history
                    eloHistory.push({
                        date: new Date().toISOString(), // Full timestamp for precision
                        elo: newElo
                    });
                }

                const newDailyStats = {
                    date: today,
                    gamesPlayed: dailyStats.gamesPlayed + 1,
                    wins: dailyStats.wins + (isWinner ? 1 : 0),
                    goalsScored: dailyStats.goalsScored + (goalsByPlayer[player.userId] || 0),
                    elo: newElo // Store end-of-day Elo
                };

                const newStats = {
                    totalGames: currentStats.totalGames + 1,
                    wins: currentStats.wins + (isWinner ? 1 : 0),
                    losses: currentStats.losses + (isWinner ? 0 : 1),
                    goalsScored: currentStats.goalsScored + (goalsByPlayer[player.userId] || 0),
                    goalsConceded: currentStats.goalsConceded + goalsConceded,
                    winRate: 0,
                    elo: newElo,
                    eloHistory: eloHistory,
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
    return allEloChanges;
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
    // Updated teams with new scores
    const updatedTeams = [...game.teams];
    updatedTeams[teamIndex] = {
        ...updatedTeams[teamIndex],
        score: newScore
    };
    updatedTeams[opponentIndex] = {
        ...updatedTeams[opponentIndex],
        score: newOpponentScore
    };

    // Note: Automatic win logic removed here. Game must be ended manually by host.

    await updateDoc(gameRef, {
        goals: arrayUnion(goal),
        teams: updatedTeams,
        score: [
            teamIndex === 0 ? newScore : newOpponentScore,
            teamIndex === 1 ? newScore : newOpponentScore
        ],
        multiplier: nextMultiplier
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

    const winner = game.teams[0].score > game.teams[1].score ? 0 :
        game.teams[1].score > game.teams[0].score ? 1 : undefined;

    if (winner === undefined) {
        throw new Error('Impossible de terminer un match sur une égalité. Continuez de jouer !');
    }

    // Update player stats BEFORE marking as completed to avoid race condition
    // (the game page listener redirects to results as soon as status is 'completed')
    let eloChanges: GameEloChanges = {};
    if (winner !== undefined) {
        const playerCount = game.teams[0].players.length;
        const format = playerCount === 1 ? '1v1' : '2v2';
        eloChanges = await updatePlayerStatsAfterGame(db, game.teams, game.goals, winner, format);
    }

    // Write everything atomically: status + eloChanges in a single update
    await updateDoc(gameRef, {
        status: 'completed',
        endedAt,
        duration,
        winner,
        ...(Object.keys(eloChanges).length > 0 ? { eloChanges } : {})
    });

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
    const winningTeamIndex = 1 - forfeitingTeamIndex;
    const symbolicWinScore = Math.max(game.teams[winningTeamIndex].score, 6);

    const updatedTeams = [...game.teams];
    updatedTeams[winningTeamIndex] = {
        ...updatedTeams[winningTeamIndex],
        score: symbolicWinScore
    };

    await updateDoc(gameRef, {
        teams: updatedTeams,
        score: [
            winningTeamIndex === 0 ? symbolicWinScore : game.score[0],
            winningTeamIndex === 1 ? symbolicWinScore : game.score[1]
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
    elo?: number;
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
                    // Fetch current Elo from user profile
                    // This is better than aggregating from games as games might be out of order or misses manual adjustments
                    entry.elo = userData.stats?.elo || 1000;
                }
            });
        }
    }

    leaderboard.sort((a, b) => {
        // Sort by Elo if available, otherwise fallback to winRate
        const eloA = a.elo || 1000;
        const eloB = b.elo || 1000;

        if (eloA !== eloB) return eloB - eloA;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
    });

    return leaderboard;
}

// Get friends leaderboard (only friends stats)
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
                    if (entry) entry.elo = u.stats?.elo || 1000;
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
                elo: u.stats?.elo || 1000
            });
        });
    }

    return users.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
}

// Get global leaderboard from all completed games
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
    const db = getFirebaseDb();

    // On récupère directement les utilisateurs triés par Elo
    // On limite aux 50 premiers pour la performance, à ajuster si besoin
    const q = query(
        collection(db, 'users'),
        where('stats.totalGames', '>', 0),
        limit(50)
    );

    const snapshot = await getDocs(q);

    const leaderboard: LeaderboardEntry[] = snapshot.docs.map(doc => {
        const userData = doc.data();
        return {
            userId: userData.userId,
            username: userData.username,
            wins: userData.stats?.wins || 0,
            losses: userData.stats?.losses || 0,
            totalGames: userData.stats?.totalGames || 0,
            goalsScored: userData.stats?.goalsScored || 0,
            winRate: userData.stats?.winRate || 0,
            elo: userData.stats?.elo || 1000
        };
    });

    // On trie côté client (car Firestore demande un index composite pour le WHERE > 0 + ORDER BY)
    return leaderboard.sort((a, b) => (b.elo || 1000) - (a.elo || 1000));
}
