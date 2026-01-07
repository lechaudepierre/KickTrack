'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    PlusCircleIcon,
    QrCodeIcon,
    ChartBarIcon,
    TrophyIcon,
    MapPinIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logout, initialize } = useAuthStore();

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="container-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-secondary">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <FieldBackground />

            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <h1 className={styles.logoTitle}>
                            KICK<span className={styles.logoAccent}>TRACK</span>
                        </h1>
                        <div className={styles.logoUnderline} />
                    </div>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Profile Card */}
                <div className={styles.profileCard}>
                    <div className={styles.profileAccent} />

                    <div className={styles.profileHeader}>
                        <div className={styles.avatar}>
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className={styles.profileInfo}>
                            <h2 className={styles.username}>{user?.username || 'Joueur'}</h2>
                            <p className={styles.gamesCount}>
                                {user?.stats.totalGames || 0} Parties
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <p className={`${styles.statValue} ${styles.statValueWins}`}>
                                {user?.stats.wins || 0}
                            </p>
                            <p className={styles.statLabel}>Victoires</p>
                        </div>
                        <div className={styles.statItem}>
                            <p className={`${styles.statValue} ${styles.statValueLosses}`}>
                                {user?.stats.losses || 0}
                            </p>
                            <p className={styles.statLabel}>Défaites</p>
                        </div>
                        <div className={styles.statItem}>
                            <p className={`${styles.statValue} ${styles.statValueRatio}`}>
                                {user?.stats.winRate ? `${Math.round(user.stats.winRate * 100)}%` : '0%'}
                            </p>
                            <p className={styles.statLabel}>Ratio</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={styles.quickActions}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionDivider} />
                        <h3 className={styles.sectionTitle}>Actions Rapides</h3>
                    </div>

                    <div className={styles.actionsList}>
                        <Link href="/game/new">
                            <div className={`${styles.actionCard} ${styles.actionCardPrimary}`}>
                                <div className={`${styles.actionIcon} ${styles.actionIconPrimary}`}>
                                    <PlusCircleIcon className="h-7 w-7 text-white" />
                                </div>
                                <div className={styles.actionContent}>
                                    <p className={`${styles.actionTitle} ${styles.actionTitlePrimary}`}>
                                        Nouvelle Partie
                                    </p>
                                    <p className={`${styles.actionDescription} ${styles.actionDescriptionPrimary}`}>
                                        Créer et inviter
                                    </p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/game/join">
                            <div className={styles.actionCard}>
                                <div className={styles.actionIcon}>
                                    <QrCodeIcon className="h-7 w-7 text-white" />
                                </div>
                                <div className={styles.actionContent}>
                                    <p className={`${styles.actionTitle} text-white`}>
                                        Rejoindre
                                    </p>
                                    <p className={styles.actionDescription}>
                                        Scanner QR code
                                    </p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Navigation Grid */}
                <div className={styles.navGrid}>
                    <Link href="/profile">
                        <div className={styles.navCard}>
                            <ChartBarIcon className={`h-10 w-10 text-[var(--color-field-green)] ${styles.navIcon}`} />
                            <p className={styles.navLabel}>Mes Stats</p>
                        </div>
                    </Link>

                    <Link href="/leaderboard">
                        <div className={styles.navCard}>
                            <TrophyIcon className={`h-10 w-10 text-[var(--color-accent-yellow)] ${styles.navIcon}`} />
                            <p className={styles.navLabel}>Classement</p>
                        </div>
                    </Link>

                    <Link href="/venues">
                        <div className={`${styles.navCard} ${styles.navCardFull}`}>
                            <MapPinIcon className={`h-8 w-8 text-[var(--color-accent-orange)] ${styles.navIcon}`} />
                            <p className={styles.navLabel}>Lieux de jeu</p>
                        </div>
                    </Link>
                </div>

                {/* Recent Activity */}
                <div className={styles.recentActivity}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionDivider} />
                        <h3 className={styles.sectionTitle}>Dernières Parties</h3>
                    </div>
                    <div className={styles.emptyState}>
                        <p className={styles.emptyText}>Aucune partie récente</p>
                        <div className={styles.emptyAction}>
                            <Link href="/game/new">
                                <div className="btn-primary">
                                    <div className="btn-primary-shadow" />
                                    <div className="btn-primary-content">
                                        Jouer ma première partie
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
