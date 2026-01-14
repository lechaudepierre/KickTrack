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

    // Moyenne de buts par type de match
    goalsPerGame: {
        overall: number;
        match6: number;  // Matchs en 6 points
        match11: number; // Matchs en 11 points
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
    comebacks: number;   // Victoires après avoir été mené

    // Balles de match
    matchPoints: {
        saved: number;   // Adversaire avait balle de match et on a marqué
        missed: number;  // On avait balle de match et l'adversaire a marqué
    };

    // Rôles (pour 2v2)
    roleStats: {
        attack: { games: number; wins: number; winRate: number };
        defense: { games: number; wins: number; winRate: number };
    };

    // Historique du winrate
    winRateHistory: Array<{ date: string; winRate: number }>;

    // Format préféré (6 ou 11 points)
    preferredFormat: '6' | '11' | null;
    formatStats: {
        '6': { games: number; wins: number; winRate: number };
        '11': { games: number; wins: number; winRate: number };
    };

    // Performance par période
    recentForm: Array<'W' | 'L' | 'D'>; // 5 derniers matchs

    // Head-to-head stats
    headToHead: HeadToHeadStats[];

    // Perfect games (6-0 ou 11-0)
    perfectGames: {
        inflicted: number;  // Nombre de 6-0 ou 11-0 infligés
        conceded: number;   // Nombre de 6-0 ou 11-0 concédés
    };
}

export function calculateAdvancedStats(
    games: Game[],
    userId: string,
    filters?: {
        venueId?: string | null;
        points?: '6' | '11' | 'all';
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

        // Filtre par points
        if (filters?.points && filters.points !== 'all' && g.gameType !== filters.points) return false;

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
    const formatStats = {
        '6': { games: 0, wins: 0, winRate: 0 },
        '11': { games: 0, wins: 0, winRate: 0 }
    };
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

    // Nouvelles stats
    let matchPointsSaved = 0;
    let matchPointsMissed = 0;
    const roleStats = {
        attack: { games: 0, wins: 0, winRate: 0 },
        defense: { games: 0, wins: 0, winRate: 0 }
    };
    const winRateHistory: Array<{ date: string; winRate: number }> = [];
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
        const targetScore = parseInt(game.gameType);

        // Winrate history
        if (isWin) cumulativeWins++;
        const date = game.startedAt instanceof Date ? game.startedAt : new Date((game.startedAt as any).seconds * 1000);
        winRateHistory.push({
            date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            winRate: (cumulativeWins / (i + 1)) * 100
        });

        // Stats par stade
        if (game.venueId && game.venueName && game.venueName.toLowerCase() !== 'aucun') {
            const venueData = venueMap.get(game.venueId) || { name: game.venueName, games: 0, wins: 0 };
            venueData.games++;
            if (isWin) venueData.wins++;
            venueMap.set(game.venueId, venueData);
        }

        // Stats par format
        formatStats[game.gameType].games++;
        if (isWin) formatStats[game.gameType].wins++;

        // Buts et positions
        const userGoals = game.goals.filter(g => g.scoredBy === userId);
        totalGoalsScored += userGoals.length;
        userGoals.forEach(g => g.position && goalsByPosition[g.position]++);

        // Rôles (2v2 uniquement, 100% des buts à la même position)
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

        // Balles de match
        let runningUserScore = 0;
        let runningOpponentScore = 0;
        for (const goal of game.goals) {
            const isUserTeamGoal = goal.teamIndex === userTeamIndex;
            const isOpponentTeamGoal = goal.teamIndex === opponentTeamIndex;

            // Si l'adversaire avait balle de match et qu'on a marqué
            if (runningOpponentScore === targetScore - 1 && isUserTeamGoal) {
                matchPointsSaved++;
            }
            // Si on avait balle de match et que l'adversaire a marqué
            if (runningUserScore === targetScore - 1 && isOpponentTeamGoal) {
                matchPointsMissed++;
            }

            if (isUserTeamGoal) runningUserScore++;
            else runningOpponentScore++;
        }

        // Autres stats classiques
        totalGoalsConceded += opponentScore;
        if (opponentScore === 0 && isWin) cleanSheets++;
        if (isWin && opponentScore === 0 && userTeamScore === targetScore) perfectGamesInflicted++;
        if (!isWin && !isDraw && userTeamScore === 0 && opponentScore === targetScore) perfectGamesConceded++;

        // Head-to-head
        game.teams[opponentTeamIndex].players.forEach(opponent => {
            const h2hData = h2hMap.get(opponent.userId) || { name: opponent.username, wins: 0, losses: 0, draws: 0 };
            if (isDraw) h2hData.draws++;
            else if (isWin) h2hData.wins++;
            else h2hData.losses++;
            h2hMap.set(opponent.userId, h2hData);
        });

        // Remontadas
        if (isWin) {
            let isRemontada = false;
            let rUser = 0, rOpp = 0;
            for (const goal of game.goals) {
                if (goal.teamIndex === userTeamIndex) rUser++; else rOpp++;
                const deficit = rOpp - rUser;
                if (targetScore === 6 && (rOpp === 4 || rOpp === 5) && deficit >= 3) isRemontada = true;
                if (targetScore === 11 && (rOpp >= 8 && rOpp <= 10) && deficit >= 5) isRemontada = true;
            }
            if (isRemontada) comebacks++;
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

    // Série actuelle (basée sur sortedGames qui est du plus récent au plus ancien)
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

    // Finalisation des winrates
    formatStats['6'].winRate = formatStats['6'].games > 0 ? formatStats['6'].wins / formatStats['6'].games : 0;
    formatStats['11'].winRate = formatStats['11'].games > 0 ? formatStats['11'].wins / formatStats['11'].games : 0;
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

    return {
        favoriteVenue: venueStats[0] || null,
        venueStats,
        goalsPerGame: {
            overall: filteredGames.length > 0 ? totalGoalsScored / filteredGames.length : 0,
            match6: formatStats['6'].games > 0 ? (chronologicalGames.filter(g => g.gameType === '6').reduce((s, g) => s + g.goals.filter(goal => goal.scoredBy === userId).length, 0)) / formatStats['6'].games : 0,
            match11: formatStats['11'].games > 0 ? (chronologicalGames.filter(g => g.gameType === '11').reduce((s, g) => s + g.goals.filter(goal => goal.scoredBy === userId).length, 0)) / formatStats['11'].games : 0
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
        matchPoints: { saved: matchPointsSaved, missed: matchPointsMissed },
        roleStats,
        winRateHistory: winRateHistory.slice(-20), // Garder les 20 derniers pour le graph
        preferredFormat: formatStats['6'].games > formatStats['11'].games ? '6' : formatStats['11'].games > formatStats['6'].games ? '11' : null,
        formatStats,
        recentForm: sortedGames.slice(0, 5).map(g => {
            const idx = g.teams.findIndex(t => t.players.some(p => p.userId === userId));
            return g.winner === undefined ? 'D' : g.winner === idx ? 'W' : 'L';
        }).reverse(),
        headToHead,
        perfectGames: { inflicted: perfectGamesInflicted, conceded: perfectGamesConceded }
    };
}

function getEmptyStats(): AdvancedStats {
    return {
        favoriteVenue: null,
        venueStats: [],
        goalsPerGame: { overall: 0, match6: 0, match11: 0 },
        favoritePosition: null,
        goalsByPosition: { defense: 0, midfield: 0, attack: 0, goalkeeper: 0 },
        winStreak: 0,
        currentStreak: { type: 'none', count: 0 },
        averageGameDuration: 0,
        totalGoalsScored: 0,
        totalGoalsConceded: 0,
        cleanSheets: 0,
        comebacks: 0,
        matchPoints: { saved: 0, missed: 0 },
        roleStats: {
            attack: { games: 0, wins: 0, winRate: 0 },
            defense: { games: 0, wins: 0, winRate: 0 }
        },
        winRateHistory: [],
        preferredFormat: null,
        formatStats: {
            '6': { games: 0, wins: 0, winRate: 0 },
            '11': { games: 0, wins: 0, winRate: 0 }
        },
        recentForm: [],
        headToHead: [],
        perfectGames: { inflicted: 0, conceded: 0 }
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
