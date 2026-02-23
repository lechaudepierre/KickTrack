import { Game, GoalPosition } from '@/types';

export interface HeadToHeadStats {
    opponentId: string;
    opponentName: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
}

export interface AdvancedStats {
    // Summary
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;

    // Lieu préféré
    favoriteVenue: {
        name: string;
        gamesPlayed: number;
        winRate: number;
    } | null;
    venueStats: Array<{
        name: string;
        gamesPlayed: number;
        wins: number;
        winRate: number;
    }>;

    // Moyenne de buts
    goalsPerGame: {
        overall: number;
    };

    // Position la plus efficace
    favoritePosition: GoalPosition | null;
    goalsByPosition: Record<GoalPosition, number>;

    // Statistiques supplémentaires
    winStreak: number;
    currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
    averageGameDuration: number; // en minutes
    totalGoalsScored: number;
    totalGoalsConceded: number;
    cleanSheets: number; // Matchs sans encaisser de but
    comebacks: number;   // Victoires après avoir été mené (déficit de 4+)


    // Rôles (pour 2v2)
    roleStats: {
        attack: { games: number; wins: number; winRate: number };
        defense: { games: number; wins: number; winRate: number };
    };

    // Historique du winrate et elo
    winRateHistory: Array<{ date: string; winRate: number }>;
    eloHistory: Array<{ date: string; elo: number }>;

    // Performance par période
    recentForm: Array<'W' | 'L' | 'D'>; // 5 derniers matchs

    // Head-to-head stats
    headToHead: HeadToHeadStats[];

    // Perfect games (adversaire à 0)
    perfectGames: {
        inflicted: number;
        conceded: number;
    };

    // Gamelles
    gamelleStats: {
        total: number;
        rentrantes: number;
        totalPercentage: number;
        rentrantesPercentage: number;
    };

    // Flash goals
    flashStats: {
        total: number;
        totalPercentage: number;
    };
}

export function calculateAdvancedStats(
    games: Game[],
    userId: string,
    filters?: {
        venueId?: string | null;
        mode?: '1v1' | '2v2' | 'all';
    }
): AdvancedStats {
    // 1. Filtrer les matchs selon les critères de base
    let filteredGames = games.filter(g => {
        if (g.status !== 'completed') return false;
        if (g.isGuestGame) return false;

        const hasGuestPlayers = g.teams?.some(team =>
            team.players?.some(player => player.userId.startsWith('guest_'))
        );
        if (hasGuestPlayers) return false;

        // Filtre par stade
        if (filters?.venueId && g.venueId !== filters.venueId) return false;

        // Filtre par mode
        if (filters?.mode && filters.mode !== 'all') {
            const is2v2 = g.teams[0].players.length + g.teams[1].players.length === 4;
            if (filters.mode === '1v1' && is2v2) return false;
            if (filters.mode === '2v2' && !is2v2) return false;
        }

        return true;
    });

    if (filteredGames.length === 0) {
        return getEmptyStats();
    }

    // Trier par date (plus ancien au plus récent pour le winrate history)
    const chronologicalGames = [...filteredGames].sort((a, b) => {
        const dateA = a.startedAt instanceof Date ? a.startedAt : new Date((a.startedAt as any).seconds * 1000);
        const dateB = b.startedAt instanceof Date ? b.startedAt : new Date((b.startedAt as any).seconds * 1000);
        return dateA.getTime() - dateB.getTime();
    });

    const sortedGames = [...chronologicalGames].reverse();

    // Initialisation des compteurs
    const venueMap = new Map<string, { name: string; games: number; wins: number }>();
    const goalsByPosition: Record<GoalPosition, number> = {
        defense: 0, midfield: 0, attack: 0, goalkeeper: 0
    };
    const h2hMap = new Map<string, { name: string; wins: number; losses: number; draws: number }>();

    let perfectGamesInflicted = 0;
    let perfectGamesConceded = 0;
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let cleanSheets = 0;
    let comebacks = 0;
    let totalDuration = 0;
    let gamesWithDuration = 0;
    let maxWinStreak = 0;
    let tempStreak = 0;

    const roleStats = {
        attack: { games: 0, wins: 0, winRate: 0 },
        defense: { games: 0, wins: 0, winRate: 0 }
    };
    let totalGamelles = 0;
    let totalGamellesRentrantes = 0;
    let totalFlash = 0;
    const winRateHistory: Array<{ date: string; winRate: number }> = [];
    const eloHistory: Array<{ date: string; elo: number }> = [];
    let cumulativeWins = 0;

    // Analyse des matchs
    for (let i = 0; i < chronologicalGames.length; i++) {
        const game = chronologicalGames[i];
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === userId));
        if (userTeamIndex === -1) continue;

        const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
        const isWin = game.winner === userTeamIndex;
        const isDraw = game.winner === undefined;
        const userTeamScore = game.teams[userTeamIndex].score;
        const opponentScore = game.teams[opponentTeamIndex].score;

        // Winrate history
        if (isWin) cumulativeWins++;
        const date = game.startedAt instanceof Date ? game.startedAt : new Date((game.startedAt as any).seconds * 1000);
        winRateHistory.push({
            date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            winRate: (cumulativeWins / (i + 1)) * 100
        });

        // Elo history
        if (game.eloChanges && game.eloChanges[userId]) {
            eloHistory.push({
                date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                elo: game.eloChanges[userId].newElo
            });
        }

        // Stats par stade
        if (game.venueId && game.venueName && game.venueName.toLowerCase() !== 'aucun') {
            const venueData = venueMap.get(game.venueId) || { name: game.venueName, games: 0, wins: 0 };
            venueData.games++;
            if (isWin) venueData.wins++;
            venueMap.set(game.venueId, venueData);
        }

        // Buts et positions
        const userGoals = game.goals.filter(g => g.scoredBy === userId);
        totalGoalsScored += userGoals.length;
        userGoals.forEach(g => {
            if (g.position) goalsByPosition[g.position]++;
            if (g.type === 'gamelle') totalGamelles++;
            if (g.type === 'gamelle_rentrante') {
                totalGamelles++;
                totalGamellesRentrantes++;
            }
            if (g.type === 'flash') totalFlash++;
        });

        // Rôles (2v2 uniquement)
        const is2v2 = game.teams[0].players.length + game.teams[1].players.length === 4;
        if (is2v2 && userGoals.length > 0) {
            const firstPos = userGoals[0].position;
            const allSamePos = userGoals.every(g => g.position === firstPos);
            if (allSamePos) {
                if (firstPos === 'attack') {
                    roleStats.attack.games++;
                    if (isWin) roleStats.attack.wins++;
                } else if (firstPos === 'defense' || firstPos === 'goalkeeper') {
                    roleStats.defense.games++;
                    if (isWin) roleStats.defense.wins++;
                }
            }
        }

        // Autres stats classiques
        totalGoalsConceded += opponentScore;
        if (opponentScore === 0 && isWin) cleanSheets++;

        // Perfect game (inflicted/conceded)
        if (isWin && opponentScore === 0) perfectGamesInflicted++;
        if (!isWin && !isDraw && userTeamScore === 0) perfectGamesConceded++;

        // Head-to-head
        game.teams[opponentTeamIndex].players.forEach(opponent => {
            const h2hData = h2hMap.get(opponent.userId) || { name: opponent.username, wins: 0, losses: 0, draws: 0 };
            if (isDraw) h2hData.draws++;
            else if (isWin) h2hData.wins++;
            else h2hData.losses++;
            h2hMap.set(opponent.userId, h2hData);
        });

        // Remontadas (Déficit de 4 buts ou plus)
        if (isWin) {
            let maxDeficit = 0;
            let rUser = 0, rOpp = 0;
            for (const goal of game.goals) {
                if (goal.teamIndex === userTeamIndex) rUser++; else rOpp++;
                const currentDeficit = rOpp - rUser;
                if (currentDeficit > maxDeficit) maxDeficit = currentDeficit;
            }
            if (maxDeficit >= 4) comebacks++;
        }

        if (game.duration && game.duration > 0) {
            totalDuration += game.duration;
            gamesWithDuration++;
        }

        // Séries
        if (!isDraw) {
            if (isWin) {
                tempStreak++;
                if (tempStreak > maxWinStreak) maxWinStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        }
    }

    // Série actuelle
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';
    for (const game of sortedGames) {
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === userId));
        const isWin = game.winner === userTeamIndex;
        const isDraw = game.winner === undefined;
        if (isDraw) break;
        const type = isWin ? 'win' : 'loss';
        if (currentStreakType === 'none') {
            currentStreakType = type;
            currentStreakCount = 1;
        } else if (currentStreakType === type) {
            currentStreakCount++;
        } else {
            break;
        }
    }

    // Finalisation
    roleStats.attack.winRate = roleStats.attack.games > 0 ? roleStats.attack.wins / roleStats.attack.games : 0;
    roleStats.defense.winRate = roleStats.defense.games > 0 ? roleStats.defense.wins / roleStats.defense.games : 0;

    const venueStats = Array.from(venueMap.values())
        .map(v => ({ name: v.name, gamesPlayed: v.games, wins: v.wins, winRate: v.games > 0 ? v.wins / v.games : 0 }))
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const positionEntries = Object.entries(goalsByPosition) as [GoalPosition, number][];
    const maxPositionGoals = Math.max(...positionEntries.map(([, count]) => count));
    const favoritePosition = maxPositionGoals > 0 ? positionEntries.find(([, count]) => count === maxPositionGoals)?.[0] || null : null;

    const headToHead = Array.from(h2hMap.entries())
        .map(([opponentId, data]) => ({
            opponentId, opponentName: data.name,
            gamesPlayed: data.wins + data.losses + data.draws,
            wins: data.wins, losses: data.losses, draws: data.draws,
            winRate: (data.wins + data.losses + data.draws) > 0 ? data.wins / (data.wins + data.losses + data.draws) : 0
        }))
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const totalGames = filteredGames.length;
    const wins = chronologicalGames.filter(g => {
        const userTeamIndex = g.teams.findIndex(t => t.players.some(p => p.userId === userId));
        return g.winner === userTeamIndex;
    }).length;
    const draws = chronologicalGames.filter(g => g.winner === undefined).length;
    const losses = totalGames - wins - draws;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return {
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        favoriteVenue: venueStats[0] || null,
        venueStats,
        goalsPerGame: {
            overall: filteredGames.length > 0 ? totalGoalsScored / filteredGames.length : 0,
        },
        favoritePosition,
        goalsByPosition,
        winStreak: maxWinStreak,
        currentStreak: { type: currentStreakType, count: currentStreakCount },
        averageGameDuration: gamesWithDuration > 0 ? (totalDuration / gamesWithDuration) / 60 : 0,
        totalGoalsScored,
        totalGoalsConceded,
        cleanSheets,
        comebacks,
        roleStats,
        winRateHistory: winRateHistory.slice(-20),
        eloHistory: eloHistory.slice(-20),
        recentForm: sortedGames.slice(0, 5).map(g => {
            const idx = g.teams.findIndex(t => t.players.some(p => p.userId === userId));
            return g.winner === undefined ? 'D' : g.winner === idx ? 'W' : 'L';
        }).reverse(),
        headToHead,
        perfectGames: { inflicted: perfectGamesInflicted, conceded: perfectGamesConceded },
        gamelleStats: {
            total: totalGamelles,
            rentrantes: totalGamellesRentrantes,
            totalPercentage: filteredGames.length > 0 ? (totalGamelles / filteredGames.length) * 100 : 0,
            rentrantesPercentage: filteredGames.length > 0 ? (totalGamellesRentrantes / filteredGames.length) * 100 : 0
        },
        flashStats: {
            total: totalFlash,
            totalPercentage: filteredGames.length > 0 ? (totalFlash / filteredGames.length) * 100 : 0
        }
    };
}

function getEmptyStats(): AdvancedStats {
    return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        favoriteVenue: null,
        venueStats: [],
        goalsPerGame: { overall: 0 },
        favoritePosition: null,
        goalsByPosition: { defense: 0, midfield: 0, attack: 0, goalkeeper: 0 },
        winStreak: 0,
        currentStreak: { type: 'none', count: 0 },
        averageGameDuration: 0,
        totalGoalsScored: 0,
        totalGoalsConceded: 0,
        cleanSheets: 0,
        comebacks: 0,
        roleStats: {
            attack: { games: 0, wins: 0, winRate: 0 },
            defense: { games: 0, wins: 0, winRate: 0 }
        },
        winRateHistory: [],
        eloHistory: [],
        recentForm: [],
        headToHead: [],
        perfectGames: { inflicted: 0, conceded: 0 },
        gamelleStats: {
            total: 0,
            rentrantes: 0,
            totalPercentage: 0,
            rentrantesPercentage: 0
        },
        flashStats: {
            total: 0,
            totalPercentage: 0
        }
    };
}

// Utilitaire pour traduire les positions
export function getPositionLabel(position: GoalPosition): string {
    const labels: Record<GoalPosition, string> = {
        attack: 'Attaque',
        defense: 'Défense',
        midfield: 'Milieu',
        goalkeeper: 'Gardien'
    };
    return labels[position] || position;
}
