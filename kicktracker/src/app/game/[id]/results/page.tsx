'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getGame } from '@/lib/firebase/games';
import { Game, Player, GoalPosition } from '@/types';
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
    const { initialize } = useAuthStore();
    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initialize();
        loadGame();
    }, [gameId]);

    const loadGame = async () => {
        try {
            const gameData = await getGame(gameId);
            setGame(gameData);
        } catch (error) {
            console.error('Error loading game:', error);
        } finally {
            setIsLoading(false);
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
                        <button onClick={() => router.push('/game/new')} className="btn-primary" style={{ border: 'none', background: 'none', padding: 0 }}>
                            <div className="btn-primary">
                                <div className="btn-primary-shadow" />
                                <div className="btn-primary-content flex items-center justify-center gap-2">
                                    <ArrowPathIcon className="w-5 h-5" />
                                    <span>Rejouer</span>
                                </div>
                            </div>
                        </button>

                        <button onClick={() => router.push('/dashboard')} className="btn-secondary" style={{ border: 'none', background: 'none', padding: 0 }}>
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
