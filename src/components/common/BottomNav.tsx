'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrophyIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useAuthStore } from '@/lib/stores/authStore';
import RankAvatar from './RankAvatar';
import styles from './BottomNav.module.css';

export default function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuthStore();

    const isLeaderboardActive = pathname === '/leaderboard';
    const isDashboardActive = pathname === '/dashboard' || pathname === '/game/new';
    const isProfileActive = pathname === '/profile';

    return (
        <div className={styles.navWrapper}>
            <nav className={styles.nav}>
                {/* Leaderboard */}
                <Link
                    href="/leaderboard"
                    className={`${styles.navItem} ${isLeaderboardActive ? styles.active : ''}`}
                >
                    <TrophyIcon className={styles.icon} />
                    <span className={styles.label}>Classement</span>
                </Link>

                {/* Main Play Button */}
                <Link href="/dashboard" className={styles.mainButton}>
                    <div className={`${styles.mainButtonInner} ${isDashboardActive ? styles.mainButtonActive : ''}`}>
                        <PlusIcon className={styles.mainIcon} />
                    </div>
                </Link>

                {/* Profile — shows user rank icon */}
                <Link
                    href="/profile"
                    className={`${styles.navItem} ${isProfileActive ? styles.active : ''}`}
                >
                    <RankAvatar elo={user?.stats?.elo} size="xs" />
                    <span className={styles.label}>Profil</span>
                </Link>
            </nav>
        </div>
    );
}
