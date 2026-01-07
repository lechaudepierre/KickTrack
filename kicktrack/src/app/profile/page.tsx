'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserGames } from '@/lib/firebase/games';
import { Game } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    ClockIcon,
    ChartBarIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState(true);

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
            loadRecentGames();
        }
    }, [user]);

    const loadRecentGames = async () => {
        if (!user) return;
        try {
            const games = await getUserGames(user.userId);
            setRecentGames(games);
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
                    <h1 className={styles.title}>Mon Profil</h1>
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
                            {user.stats.goalsScored}
                        </p>
                        <p className={styles.statLabel}>Buts</p>
                    </div>
                </div>

                <div>
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
                                    <Link key={game.gameId} href={`/game/${game.gameId}/results`}>
                                        <div className={styles.gameCard}>
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
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
