'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import BottomNav from '@/components/common/BottomNav';
import {
    PlusCircleIcon,
    QrCodeIcon,
    UserPlusIcon,
    MapPinIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, initialize } = useAuthStore();

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

    // Use pre-computed stats from user profile (accurate, no limit)
    const stats = {
        wins: user?.stats?.wins ?? 0,
        totalGames: user?.stats?.totalGames ?? 0,
        winRate: user?.stats?.winRate ?? 0,
    };

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
                            <span className={styles.actionSubtitle}>Code PIN</span>
                        </div>
                    </Link>

                    <Link href="/tournament/new" className={styles.tournamentAction}>
                        <div className={styles.actionIconWrapper}>
                            <TrophyIcon className={styles.actionIcon} />
                        </div>
                        <div className={styles.actionText}>
                            <span className={styles.actionTitle}>Tournoi</span>
                            <span className={styles.actionSubtitle}>Creer un tournoi</span>
                        </div>
                    </Link>

                    {/* Small Actions */}
                    <div className={styles.smallActions}>
                        <Link href="/friends" className={styles.smallAction}>
                            <div className={styles.smallActionIconWrapper}>
                                <UserPlusIcon className={styles.smallActionIcon} />
                            </div>
                            <span className={styles.smallActionTitle}>+ Ami</span>
                        </Link>

                        <Link href="/venues" className={styles.smallAction}>
                            <div className={styles.smallActionIconWrapper}>
                                <MapPinIcon className={styles.smallActionIcon} />
                            </div>
                            <span className={styles.smallActionTitle}>+ Stade</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{user?.stats.elo || 1000}</span>
                        <span className={styles.statLabel}>Elo</span>
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
