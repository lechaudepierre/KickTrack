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
    userId: string
): AdvancedStats {
    // Filtrer les matchs complétés uniquement et exclure les parties avec invités
    const completedGames = games.filter(g => {
        if (g.status !== 'completed') return false;
        if (g.isGuestGame) return false; // Exclude guest games
        return true;
    });

    if (completedGames.length === 0) {
        return getEmptyStats();
    }

    // Trier par date (plus récent en premier)
    const sortedGames = [...completedGames].sort((a, b) => {
        const dateA = a.startedAt instanceof Date ? a.startedAt : new Date((a.startedAt as any).seconds * 1000);
        const dateB = b.startedAt instanceof Date ? b.startedAt : new Date((b.startedAt as any).seconds * 1000);
        return dateB.getTime() - dateA.getTime();
    });

    // Stats par stade
    const venueMap = new Map<string, { name: string; games: number; wins: number }>();

    // Stats par format
    const formatStats = {
        '6': { games: 0, wins: 0, winRate: 0 },
        '11': { games: 0, wins: 0, winRate: 0 }
    };

    // Stats par position
    const goalsByPosition: Record<GoalPosition, number> = {
        defense: 0,
        midfield: 0,
        attack: 0,
        goalkeeper: 0
    };

    // Head-to-head map
    const h2hMap = new Map<string, { name: string; wins: number; losses: number; draws: number }>();

    // Perfect games
    let perfectGamesInflicted = 0;
    let perfectGamesConceded = 0;

    // Autres stats
    let totalGoalsScored = 0;
    let totalGoalsConceded = 0;
    let cleanSheets = 0;
    let comebacks = 0;
    let totalDuration = 0;
    let gamesWithDuration = 0;
    let maxWinStreak = 0;
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';
    let tempStreak = 0;
    let lastResult: 'win' | 'loss' | 'none' | null = null;

    // Forme récente (5 derniers matchs)
    const recentForm: Array<'W' | 'L' | 'D'> = [];

    for (let i = 0; i < sortedGames.length; i++) {
        const game = sortedGames[i];

        // Trouver l'équipe du joueur
        const userTeamIndex = game.teams.findIndex(t =>
            t.players.some(p => p.userId === userId)
        );

        if (userTeamIndex === -1) continue;

        const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
        const isWin = game.winner === userTeamIndex;
        const isDraw = game.winner === undefined;
        const userTeamScore = game.teams[userTeamIndex].score;
        const opponentScore = game.teams[opponentTeamIndex].score;

        // Forme récente
        if (recentForm.length < 5) {
            recentForm.push(isDraw ? 'D' : isWin ? 'W' : 'L');
        }


        // Stats par stade - exclude 'Aucun' venue
        if (game.venueId && game.venueName && game.venueName.toLowerCase() !== 'aucun') {
            const venueKey = game.venueId;
            const venueData = venueMap.get(venueKey) || { name: game.venueName, games: 0, wins: 0 };
            venueData.games++;
            if (isWin) venueData.wins++;
            venueMap.set(venueKey, venueData);
        }

        // Stats par format
        const format = game.gameType;
        formatStats[format].games++;
        if (isWin) formatStats[format].wins++;

        // Buts marqués par le joueur et position
        const userGoals = game.goals.filter(g => g.scoredBy === userId);
        totalGoalsScored += userGoals.length;

        for (const goal of userGoals) {
            if (goal.position) {
                goalsByPosition[goal.position]++;
            }
        }

        // Buts encaissés
        totalGoalsConceded += opponentScore;

        // Clean sheets
        if (opponentScore === 0 && isWin) {
            cleanSheets++;
        }

        // Perfect games (6-0 ou 11-0)
        const targetScore = parseInt(game.gameType);
        if (isWin && opponentScore === 0 && userTeamScore === targetScore) {
            perfectGamesInflicted++;
        }
        if (!isWin && !isDraw && userTeamScore === 0 && opponentScore === targetScore) {
            perfectGamesConceded++;
        }

        // Head-to-head stats
        const opponents = game.teams[opponentTeamIndex].players;
        for (const opponent of opponents) {
            const h2hData = h2hMap.get(opponent.userId) || {
                name: opponent.username,
                wins: 0,
                losses: 0,
                draws: 0
            };
            if (isDraw) {
                h2hData.draws++;
            } else if (isWin) {
                h2hData.wins++;
            } else {
                h2hData.losses++;
            }
            h2hMap.set(opponent.userId, h2hData);
        }

        // Comebacks (victoire après avoir été mené)
        if (isWin) {
            let wasLosing = false;
            let runningUserScore = 0;
            let runningOpponentScore = 0;

            for (const goal of game.goals) {
                if (goal.teamIndex === userTeamIndex) {
                    runningUserScore++;
                } else {
                    runningOpponentScore++;
                }
                if (runningOpponentScore > runningUserScore) {
                    wasLosing = true;
                }
            }
            if (wasLosing) comebacks++;
        }

        // Durée (game.duration est en secondes)
        if (game.duration && game.duration > 0) {
            totalDuration += game.duration;
            gamesWithDuration++;
        }

        // Calcul des séries
        const currentResult = isDraw ? 'none' : (isWin ? 'win' : 'loss');

        if (i === 0) {
            // Premier match
            currentStreakType = currentResult === 'none' ? 'none' : currentResult;
            currentStreakCount = currentResult === 'none' ? 0 : 1;
        } else {
            // Mise à jour streak actuel
            if (currentResult === 'none') {
                // Un match nul casse la série
                currentStreakType = 'none';
                currentStreakCount = 0;
            } else if (currentStreakType === currentResult) {
                // Continue la série
                currentStreakCount++;
            } else {
                // Change de type de série - RESET à 1
                currentStreakType = currentResult;
                currentStreakCount = 1;
            }
        }

        // Calcul de la meilleure série de victoires
        if (lastResult === currentResult && currentResult === 'win') {
            tempStreak++;
        } else {
            if (lastResult === 'win' && tempStreak > maxWinStreak) {
                maxWinStreak = tempStreak;
            }
            tempStreak = currentResult === 'win' ? 1 : 0;
        }
        lastResult = currentResult;
    }

    // Finaliser la meilleure série
    if (lastResult === 'win' && tempStreak > maxWinStreak) {
        maxWinStreak = tempStreak;
    }

    // Calculer winRates des formats
    formatStats['6'].winRate = formatStats['6'].games > 0
        ? formatStats['6'].wins / formatStats['6'].games
        : 0;
    formatStats['11'].winRate = formatStats['11'].games > 0
        ? formatStats['11'].wins / formatStats['11'].games
        : 0;

    // Trouver le stade préféré
    const venueStats = Array.from(venueMap.values())
        .map(v => ({
            name: v.name,
            gamesPlayed: v.games,
            wins: v.wins,
            winRate: v.games > 0 ? v.wins / v.games : 0
        }))
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const favoriteVenue = venueStats.length > 0
        ? venueStats[0]
        : null;

    // Position favorite
    const positionEntries = Object.entries(goalsByPosition) as [GoalPosition, number][];
    const maxPositionGoals = Math.max(...positionEntries.map(([, count]) => count));
    const favoritePosition = maxPositionGoals > 0
        ? positionEntries.find(([, count]) => count === maxPositionGoals)?.[0] || null
        : null;

    // Format préféré
    const preferredFormat = formatStats['6'].games > formatStats['11'].games
        ? '6'
        : formatStats['11'].games > formatStats['6'].games
            ? '11'
            : null;

    // Moyennes de buts
    const goalsIn6 = sortedGames
        .filter(g => g.gameType === '6')
        .reduce((sum, g) => sum + g.goals.filter(goal => goal.scoredBy === userId).length, 0);
    const goalsIn11 = sortedGames
        .filter(g => g.gameType === '11')
        .reduce((sum, g) => sum + g.goals.filter(goal => goal.scoredBy === userId).length, 0);

    // Head-to-head stats triés par nombre de parties
    const headToHead: HeadToHeadStats[] = Array.from(h2hMap.entries())
        .map(([opponentId, data]) => ({
            opponentId,
            opponentName: data.name,
            gamesPlayed: data.wins + data.losses + data.draws,
            wins: data.wins,
            losses: data.losses,
            draws: data.draws,
            winRate: (data.wins + data.losses + data.draws) > 0
                ? data.wins / (data.wins + data.losses + data.draws)
                : 0
        }))
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    return {
        favoriteVenue,
        venueStats,
        goalsPerGame: {
            overall: completedGames.length > 0 ? totalGoalsScored / completedGames.length : 0,
            match6: formatStats['6'].games > 0 ? goalsIn6 / formatStats['6'].games : 0,
            match11: formatStats['11'].games > 0 ? goalsIn11 / formatStats['11'].games : 0
        },
        favoritePosition,
        goalsByPosition,
        winStreak: maxWinStreak,
        currentStreak: {
            type: currentStreakType,
            count: currentStreakCount
        },
        averageGameDuration: gamesWithDuration > 0
            ? (totalDuration / gamesWithDuration) / 60
            : 0,
        totalGoalsScored,
        totalGoalsConceded,
        cleanSheets,
        comebacks,
        preferredFormat,
        formatStats,
        recentForm: recentForm.reverse(), // Most recent on the right
        headToHead,
        perfectGames: {
            inflicted: perfectGamesInflicted,
            conceded: perfectGamesConceded
        }
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
