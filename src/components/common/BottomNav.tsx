'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrophyIcon, PlusIcon, UserIcon } from '@heroicons/react/24/solid';
import styles from './BottomNav.module.css';

const navItems = [
    { href: '/leaderboard', icon: TrophyIcon, label: 'Classement' },
    { href: '/dashboard', icon: PlusIcon, label: 'Jouer', isMain: true },
    { href: '/profile', icon: UserIcon, label: 'Profil' },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className={styles.navWrapper}>
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href === '/dashboard' && pathname === '/game/new');
                    const Icon = item.icon;

                    if (item.isMain) {
                        const isMainActive = pathname === '/dashboard';
                        return (
                            <Link key={item.href} href="/dashboard" className={styles.mainButton}>
                                <div className={`${styles.mainButtonInner} ${isMainActive ? styles.mainButtonActive : ''}`}>
                                    <Icon className={styles.mainIcon} />
                                </div>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Icon className={styles.icon} />
                            <span className={styles.label}>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
