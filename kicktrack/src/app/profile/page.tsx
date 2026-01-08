'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserGames } from '@/lib/firebase/games';
import { Game } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import { calculateAdvancedStats, getPositionLabel, AdvancedStats } from '@/lib/utils/statsCalculator';
import {
    ArrowLeftIcon,
    ClockIcon,
    MapPinIcon,
    FireIcon,
    TrophyIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState(true);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            loadGames();
        }
    }, [user]);

    const loadGames = async () => {
        if (!user) return;
        try {
            // Charger plus de parties pour les stats avancées
            const games = await getUserGames(user.userId, 100);
            setAllGames(games);
            setRecentGames(games.slice(0, 10));

            // Calculer les stats avancées
            const stats = calculateAdvancedStats(games, user.userId);
            setAdvancedStats(stats);
        } catch (error) {
            console.error('Error loading games:', error);
        } finally {
            setIsLoadingGames(false);
        }
    };

    if (authLoading) {
        return (
            <div className="container-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const formatDate = (date: Date | any) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date.seconds * 1000);
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    };

    const getGameResult = (game: Game) => {
        if (game.winner === undefined) return 'Nul';

        // Find user's team index
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === user.userId));

        if (userTeamIndex === -1) return '?';

        return game.winner === userTeamIndex ? 'Victoire' : 'Défaite';
    };

    return (
        <div className={styles.container}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className={styles.title}>Mes Stats</h1>
                </div>

                <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                        <h2 className={styles.username}>{user.username}</h2>
                        <p className={styles.joinDate}>
                            Membre depuis {formatDate(user.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Stats principales */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                        <p className={`${styles.statValue} ${styles.statValueHighlight}`}>
                            {user.stats.wins}
                        </p>
                        <p className={styles.statLabel}>Victoires</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue} style={{ color: 'var(--color-accent-orange)' }}>
                            {user.stats.losses}
                        </p>
                        <p className={styles.statLabel}>Défaites</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue}>
                            {user.stats.totalGames}
                        </p>
                        <p className={styles.statLabel}>Parties</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue}>
                            {user.stats.winRate ? `${Math.round(user.stats.winRate * 100)}%` : '0%'}
                        </p>
                        <p className={styles.statLabel}>Ratio</p>
                    </div>
                </div>

                {/* Stats avancées */}
                {advancedStats && !isLoadingGames && (
                    <>
                        {/* Forme récente */}
                        {advancedStats.recentForm.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <FireIcon className="w-5 h-5" />
                                    Forme récente
                                </h3>
                                <div className={styles.formCard}>
                                    <div className={styles.formIndicators}>
                                        {advancedStats.recentForm.map((result, i) => (
                                            <div
                                                key={i}
                                                className={`${styles.formBadge} ${result === 'W' ? styles.formWin : result === 'L' ? styles.formLoss : styles.formDraw
                                                    }`}
                                            >
                                                {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
                                            </div>
                                        ))}
                                    </div>
                                    {advancedStats.currentStreak.count > 0 && (
                                        <p className={styles.streakText}>
                                            {advancedStats.currentStreak.type === 'win'
                                                ? `${advancedStats.currentStreak.count} victoire${advancedStats.currentStreak.count > 1 ? 's' : ''} d'affilée`
                                                : `${advancedStats.currentStreak.count} défaite${advancedStats.currentStreak.count > 1 ? 's' : ''} d'affilée`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lieu préféré */}
                        {advancedStats.favoriteVenue && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <MapPinIcon className="w-5 h-5" />
                                    Lieu préféré
                                </h3>
                                <div className={styles.venueCard}>
                                    <div className={styles.venueIcon}>
                                        <MapPinIcon className="w-6 h-6" />
                                    </div>
                                    <div className={styles.venueInfo}>
                                        <p className={styles.venueName}>{advancedStats.favoriteVenue.name}</p>
                                        <p className={styles.venueStats}>
                                            {advancedStats.favoriteVenue.gamesPlayed} parties • {Math.round(advancedStats.favoriteVenue.winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                </div>
                                {advancedStats.venueStats.length > 1 && (
                                    <div className={styles.venueList}>
                                        {advancedStats.venueStats.slice(1, 4).map((venue, i) => (
                                            <div key={i} className={styles.venueListItem}>
                                                <span className={styles.venueListName}>{venue.name}</span>
                                                <span className={styles.venueListGames}>{venue.gamesPlayed} parties</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Moyenne de buts */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Moyenne de buts
                            </h3>
                            <div className={styles.goalsGrid}>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.overall.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Par match</p>
                                </div>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.match6.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Match en 6</p>
                                </div>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.match11.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Match en 11</p>
                                </div>
                            </div>
                        </div>

                        {/* Position préférée */}
                        {advancedStats.favoritePosition && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <TrophyIcon className="w-5 h-5" />
                                    Zone de tir favorite
                                </h3>
                                <div className={styles.positionCard}>
                                    <div className={styles.positionHighlight}>
                                        <span className={styles.positionName}>
                                            {getPositionLabel(advancedStats.favoritePosition)}
                                        </span>
                                        <span className={styles.positionGoals}>
                                            {advancedStats.goalsByPosition[advancedStats.favoritePosition]} buts
                                        </span>
                                    </div>
                                    <div className={styles.positionBreakdown}>
                                        {Object.entries(advancedStats.goalsByPosition)
                                            .filter(([, count]) => count > 0)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([position, count]) => {
                                                const total = Object.values(advancedStats.goalsByPosition).reduce((a, b) => a + b, 0);
                                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                                return (
                                                    <div key={position} className={styles.positionRow}>
                                                        <span className={styles.positionRowLabel}>
                                                            {getPositionLabel(position as any)}
                                                        </span>
                                                        <div className={styles.positionBar}>
                                                            <div
                                                                className={styles.positionBarFill}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className={styles.positionRowCount}>{count}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats supplémentaires */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Stats détaillées
                            </h3>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Meilleure série</span>
                                    <span className={styles.detailValue}>{advancedStats.winStreak} victoires</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Clean sheets</span>
                                    <span className={styles.detailValue}>{advancedStats.cleanSheets}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Remontadas</span>
                                    <span className={styles.detailValue}>{advancedStats.comebacks}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Durée moyenne</span>
                                    <span className={styles.detailValue}>{advancedStats.averageGameDuration.toFixed(0)} min</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Buts marqués</span>
                                    <span className={styles.detailValue}>{advancedStats.totalGoalsScored}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Buts encaissés</span>
                                    <span className={styles.detailValue}>{advancedStats.totalGoalsConceded}</span>
                                </div>
                            </div>
                        </div>

                        {/* Format préféré */}
                        {advancedStats.preferredFormat && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <ChartBarIcon className="w-5 h-5" />
                                    Par format de match
                                </h3>
                                <div className={styles.formatGrid}>
                                    <div className={`${styles.formatCard} ${advancedStats.preferredFormat === '6' ? styles.formatCardActive : ''}`}>
                                        <p className={styles.formatTitle}>Match en 6</p>
                                        <p className={styles.formatGames}>{advancedStats.formatStats['6'].games} parties</p>
                                        <p className={styles.formatWinRate}>
                                            {Math.round(advancedStats.formatStats['6'].winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                    <div className={`${styles.formatCard} ${advancedStats.preferredFormat === '11' ? styles.formatCardActive : ''}`}>
                                        <p className={styles.formatTitle}>Match en 11</p>
                                        <p className={styles.formatGames}>{advancedStats.formatStats['11'].games} parties</p>
                                        <p className={styles.formatWinRate}>
                                            {Math.round(advancedStats.formatStats['11'].winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Perfect Games */}
                        {(advancedStats.perfectGames.inflicted > 0 || advancedStats.perfectGames.conceded > 0) && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <TrophyIcon className="w-5 h-5" />
                                    Perfect Games
                                </h3>
                                <div className={styles.perfectGrid}>
                                    <div className={styles.perfectCard}>
                                        <p className={styles.perfectValue} style={{ color: 'var(--color-field-green)' }}>
                                            {advancedStats.perfectGames.inflicted}
                                        </p>
                                        <p className={styles.perfectLabel}>Infligés</p>
                                        <p className={styles.perfectDesc}>6-0 ou 11-0</p>
                                    </div>
                                    <div className={styles.perfectCard}>
                                        <p className={styles.perfectValue} style={{ color: 'var(--color-accent-orange)' }}>
                                            {advancedStats.perfectGames.conceded}
                                        </p>
                                        <p className={styles.perfectLabel}>Concédés</p>
                                        <p className={styles.perfectDesc}>6-0 ou 11-0</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Head-to-Head */}
                        {advancedStats.headToHead.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <ChartBarIcon className="w-5 h-5" />
                                    Face à face
                                </h3>
                                <div className={styles.h2hList}>
                                    {advancedStats.headToHead.slice(0, 5).map((h2h) => (
                                        <div key={h2h.odentId} className={styles.h2hCard}>
                                            <div className={styles.h2hInfo}>
                                                <span className={styles.h2hName}>{h2h.opponentName}</span>
                                                <span className={styles.h2hGames}>{h2h.gamesPlayed} parties</span>
                                            </div>
                                            <div className={styles.h2hStats}>
                                                <span className={styles.h2hWins}>{h2h.wins}V</span>
                                                <span className={styles.h2hSeparator}>-</span>
                                                <span className={styles.h2hLosses}>{h2h.losses}D</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Dernières parties */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        <ClockIcon className="w-5 h-5" />
                        Dernières parties
                    </h3>

                    {isLoadingGames ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : recentGames.length === 0 ? (
                        <div className={styles.emptyState}>
                            Aucune partie jouée pour le moment
                        </div>
                    ) : (
                        <div className={styles.gamesList}>
                            {recentGames.map((game) => {
                                const result = getGameResult(game);
                                const isWin = result === 'Victoire';

                                return (
                                    <div key={game.gameId} className={styles.gameCard}>
                                        <div className={styles.gameInfo}>
                                            <span className={`${styles.gameResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>
                                                {result}
                                            </span>
                                            <span className={styles.gameDate}>
                                                {formatDate(game.startedAt)}
                                            </span>
                                            <span className="text-xs text-secondary">
                                                {game.venueName}
                                            </span>
                                        </div>
                                        <div className={styles.gameScore}>
                                            {game.score[0]} - {game.score[1]}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
