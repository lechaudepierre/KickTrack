'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getGame, getUserGames } from '@/lib/firebase/games';
import { subscribeToSession, startGame } from '@/lib/firebase/game-sessions';
import { Game, Player, GoalPosition, Team } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import { TrophyIcon, HomeIcon, ArrowPathIcon, StarIcon } from '@heroicons/react/24/solid';
import styles from '@/styles/content-page.module.css';
import resultsStyles from './results-page.module.css';

interface PlayerStats {
    player: Player;
    totalGoals: number;
    byPosition: Record<GoalPosition, number>;
    teamColor: string;
}

export default function GameResultsPage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { user, initialize } = useAuthStore();
    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRematching, setIsRematching] = useState(false);
    const [h2hStats, setH2HStats] = useState<{ team0Wins: number; team1Wins: number } | null>(null);

    useEffect(() => {
        initialize();
        loadGame();
    }, [gameId]);

    const loadGame = async () => {
        try {
            const gameData = await getGame(gameId);
            if (gameData) {
                setGame(gameData);
                loadH2HStats(gameData);
            }
        } catch (error) {
            console.error('Error loading game:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadH2HStats = async (currentGame: Game) => {
        try {
            const hostId = currentGame.hostId;
            const allHostGames = await getUserGames(hostId, 50); // Fetch last 50 games

            const currentTeam0Ids = currentGame.teams[0].players.map(p => p.userId).sort();
            const currentTeam1Ids = currentGame.teams[1].players.map(p => p.userId).sort();

            let team0Wins = 0;
            let team1Wins = 0;

            allHostGames.forEach(g => {
                if (g.status !== 'completed' || g.winner === undefined) return;

                const gTeam0Ids = g.teams[0].players.map(p => p.userId).sort();
                const gTeam1Ids = g.teams[1].players.map(p => p.userId).sort();

                const isSameMatchup =
                    (JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam0Ids) && JSON.stringify(gTeam1Ids) === JSON.stringify(currentTeam1Ids)) ||
                    (JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam1Ids) && JSON.stringify(gTeam1Ids) === JSON.stringify(currentTeam0Ids));

                if (isSameMatchup) {
                    const side0IsTeam0 = JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam0Ids);
                    if (g.winner === 0) {
                        if (side0IsTeam0) team0Wins++; else team1Wins++;
                    } else {
                        if (side0IsTeam0) team1Wins++; else team0Wins++;
                    }
                }
            });

            setH2HStats({ team0Wins, team1Wins });
        } catch (error) {
            console.error('Error loading H2H stats:', error);
        }
    };

    // Listen for rematch (session update)
    useEffect(() => {
        if (!game?.sessionId || user?.userId === game.hostId) return;

        const unsubscribe = subscribeToSession(game.sessionId, (session) => {
            if (session?.status === 'active' && session.gameId && session.gameId !== gameId) {
                router.push(`/game/${session.gameId}`);
            }
        });

        return () => unsubscribe();
    }, [game?.sessionId, gameId, user?.userId, router]);

    const handleRematch = async () => {
        if (!game || !game.sessionId || isRematching) return;

        setIsRematching(true);
        try {
            // Reset scores for the new game
            const newTeams: [Team, Team] = [
                { ...game.teams[0], score: 0 },
                { ...game.teams[1], score: 0 }
            ];

            const newGame = await startGame(
                game.sessionId,
                newTeams,
                parseInt(game.gameType) as 6 | 11
            );

            router.push(`/game/${newGame.gameId}`);
        } catch (error) {
            console.error('Error starting rematch:', error);
            setIsRematching(false);
        }
    };

    if (isLoading) return (
        <div className="container-center">
            <div className={styles.spinner} />
        </div>
    );

    if (!game) return (
        <div className="container-center">
            <p className="text-secondary">Partie introuvable</p>
        </div>
    );

    const winnerIndex = game.winner;
    const isDraw = winnerIndex === undefined;
    const winningTeam = winnerIndex !== undefined ? game.teams[winnerIndex] : null;

    // Calculate detailed stats
    const stats: Record<string, PlayerStats> = {};

    // Initialize stats for all players
    game.teams.forEach(team => {
        team.players.forEach(player => {
            stats[player.userId] = {
                player,
                totalGoals: 0,
                byPosition: {} as Record<GoalPosition, number>,
                teamColor: team.color
            };
        });
    });

    // Count goals
    game.goals.forEach(goal => {
        if (stats[goal.scoredBy]) {
            stats[goal.scoredBy].totalGoals += 1;
            if (goal.position) {
                stats[goal.scoredBy].byPosition[goal.position] = (stats[goal.scoredBy].byPosition[goal.position] || 0) + 1;
            }
        }
    });

    const sortedStats = Object.values(stats).sort((a, b) => b.totalGoals - a.totalGoals);
    const mvpId = sortedStats[0]?.player.userId;

    const positionLabels: Record<GoalPosition, string> = {
        attack: 'Attaque',
        defense: 'Défense',
        midfield: 'Milieu',
        goalkeeper: 'Gardien'
    };

    const getTrophyClass = () => {
        if (isDraw) return resultsStyles.drawTrophy;
        return resultsStyles[`${winningTeam?.color}Trophy`] || resultsStyles.drawTrophy;
    };

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />
            <div className={styles.contentWrapper}>
                <div className={resultsStyles.container}>

                    {/* Trophy & Winner */}
                    <div className={resultsStyles.trophyContainer}>
                        <div className={`${resultsStyles.trophyCircle} ${getTrophyClass()}`}>
                            <TrophyIcon className={resultsStyles.trophyIcon} />
                        </div>

                        <h1 className={resultsStyles.winnerTitle}>
                            {isDraw ? 'Match Nul !' : `Victoire ${winningTeam?.color === 'blue' ? 'Bleue' :
                                winningTeam?.color === 'red' ? 'Rouge' :
                                    winningTeam?.color === 'green' ? 'Verte' :
                                        winningTeam?.color === 'yellow' ? 'Jaune' :
                                            winningTeam?.color === 'orange' ? 'Orange' :
                                                winningTeam?.color === 'purple' ? 'Violette' : 'Équipe'} !`}
                        </h1>
                        <p className={resultsStyles.finalScore}>
                            {game.score[0]} — {game.score[1]}
                        </p>
                    </div>

                    {/* H2H Stats */}
                    {h2hStats && (h2hStats.team0Wins > 0 || h2hStats.team1Wins > 0) && (
                        <div className={resultsStyles.h2hContainer}>
                            <div className={resultsStyles.h2hHeader}>
                                <span style={{ color: `var(--team-${game.teams[0].color})` }}>{h2hStats.team0Wins}</span>
                                <span className={resultsStyles.h2hTitle}>FACE À FACE</span>
                                <span style={{ color: `var(--team-${game.teams[1].color})` }}>{h2hStats.team1Wins}</span>
                            </div>
                            <div className={resultsStyles.h2hBar}>
                                <div
                                    className={resultsStyles.h2hFill}
                                    style={{
                                        width: `${(h2hStats.team0Wins / (h2hStats.team0Wins + h2hStats.team1Wins)) * 100}%`,
                                        backgroundColor: `var(--team-${game.teams[0].color})`
                                    }}
                                />
                                <div
                                    className={resultsStyles.h2hFill}
                                    style={{
                                        width: `${(h2hStats.team1Wins / (h2hStats.team0Wins + h2hStats.team1Wins)) * 100}%`,
                                        backgroundColor: `var(--team-${game.teams[1].color})`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className={resultsStyles.statsGrid}>
                        {sortedStats.map((stat) => (
                            <div key={stat.player.userId} className={resultsStyles.statCard}>
                                <div className={resultsStyles.statHeader}>
                                    <div
                                        className={resultsStyles.playerAvatar}
                                        style={{ backgroundColor: `var(--team-${stat.teamColor})`, borderColor: '#333333' }}
                                    >
                                        {stat.player.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={resultsStyles.playerInfo}>
                                        <div className="flex items-center gap-2">
                                            <p className={resultsStyles.playerName}>{stat.player.username}</p>
                                            {stat.player.userId === mvpId && stat.totalGoals > 0 && (
                                                <span className={resultsStyles.mvpBadge}>
                                                    <StarIcon className="w-2 h-2" /> MVP
                                                </span>
                                            )}
                                        </div>
                                        <p className={resultsStyles.playerGoals}>
                                            {stat.totalGoals} {stat.totalGoals > 1 ? 'buts' : 'but'}
                                        </p>
                                    </div>
                                </div>

                                {stat.totalGoals > 0 && (
                                    <div className={resultsStyles.positionBreakdown}>
                                        {Object.entries(stat.byPosition).map(([pos, count]) => (
                                            <span key={pos} className={resultsStyles.positionPill}>
                                                {count} {positionLabels[pos as GoalPosition]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className={resultsStyles.actions}>
                        {user?.userId === game.hostId ? (
                            <button
                                onClick={handleRematch}
                                disabled={isRematching}
                                className="btn-primary"
                                style={{ border: 'none', background: 'none', padding: 0, width: '100%' }}
                            >
                                <div className="btn-primary">
                                    <div className="btn-primary-shadow" />
                                    <div className="btn-primary-content flex items-center justify-center gap-2">
                                        <ArrowPathIcon className={`w-5 h-5 ${isRematching ? 'animate-spin' : ''}`} />
                                        <span>{isRematching ? 'Lancement...' : 'Rejouer'}</span>
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10 w-full">
                                <p className="text-sm font-bold opacity-60 uppercase tracking-widest">
                                    En attente de l'hôte...
                                </p>
                            </div>
                        )}

                        <button onClick={() => router.push('/dashboard')} className="btn-secondary" style={{ border: 'none', background: 'none', padding: 0, width: '100%' }}>
                            <div className="btn-secondary">
                                <div className="btn-secondary-shadow" />
                                <div className="btn-secondary-content flex items-center justify-center gap-2" style={{ color: 'white' }}>
                                    <HomeIcon className="w-5 h-5" />
                                    <span>Tableau de bord</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
