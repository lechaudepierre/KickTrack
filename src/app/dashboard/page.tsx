'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserGames } from '@/lib/firebase/games';
import { Game } from '@/types';
import BottomNav from '@/components/common/BottomNav';
import {
    PlusCircleIcon,
    QrCodeIcon,
    UserPlusIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, initialize } = useAuthStore();
    const [games, setGames] = useState<Game[]>([]);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (user) {
            getUserGames(user.userId, 100).then(setGames);
        }
    }, [user]);

    // Calculate stats from games (same logic as profile page)
    const stats = useMemo(() => {
        if (!user) return { wins: 0, totalGames: 0, winRate: 0 };

        const completedGames = games.filter(g => g.status === 'completed');

        let wins = 0;
        for (const game of completedGames) {
            const userTeamIndex = game.teams.findIndex(t =>
                t.players.some(p => p.userId === user.userId)
            );
            if (userTeamIndex !== -1 && game.winner === userTeamIndex) {
                wins++;
            }
        }

        const totalGames = completedGames.length;
        const winRate = totalGames > 0 ? wins / totalGames : 0;

        return { wins, totalGames, winRate };
    }, [games, user]);

    if (isLoading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>Chargement...</p>
            </div>
        );
    }

    return (
        <div className={styles.screen}>
            <div className={styles.container}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.logo}>
                        <h1 className={styles.logoText}>
                            KICK<span className={styles.logoAccent}>TRACKER</span>
                        </h1>
                    </div>
                </header>

                {/* Welcome */}
                <div className={styles.welcome}>
                    <h2 className={styles.welcomeText}>
                        Salut <span className={styles.username}>{user?.username || 'Joueur'}</span> !
                    </h2>
                </div>

                {/* Action Buttons */}
                <div className={styles.actions}>
                    <Link href="/game/new" className={styles.primaryAction}>
                        <div className={styles.actionIconWrapper}>
                            <PlusCircleIcon className={styles.actionIcon} />
                        </div>
                        <div className={styles.actionText}>
                            <span className={styles.actionTitle}>Nouvelle Partie</span>
                            <span className={styles.actionSubtitle}>Créer et inviter</span>
                        </div>
                    </Link>

                    <Link href="/game/join" className={styles.secondaryAction}>
                        <div className={styles.actionIconWrapper}>
                            <QrCodeIcon className={styles.actionIcon} />
                        </div>
                        <div className={styles.actionText}>
                            <span className={styles.actionTitle}>Rejoindre</span>
                            <span className={styles.actionSubtitle}>Scanner QR code</span>
                        </div>
                    </Link>

                    {/* Small Actions */}
                    <div className={styles.smallActions}>
                        <button
                            onClick={() => alert('Fonctionnalité bientôt disponible !')}
                            className={styles.smallAction}
                        >
                            <div className={styles.smallActionIconWrapper}>
                                <UserPlusIcon className={styles.smallActionIcon} />
                            </div>
                            <span className={styles.smallActionTitle}>Ajouter un ami</span>
                        </button>

                        <Link href="/venues" className={styles.smallAction}>
                            <div className={styles.smallActionIconWrapper}>
                                <MapPinIcon className={styles.smallActionIcon} />
                            </div>
                            <span className={styles.smallActionTitle}>Ajouter un stade</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.wins}</span>
                        <span className={styles.statLabel}>Victoires</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.totalGames}</span>
                        <span className={styles.statLabel}>Parties</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>
                            {stats.winRate ? `${Math.round(stats.winRate * 100)}%` : '0%'}
                        </span>
                        <span className={styles.statLabel}>Ratio</span>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
