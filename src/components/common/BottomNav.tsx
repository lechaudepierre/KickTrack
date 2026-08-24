'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrophyIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/24/solid';
import { useAuthStore } from '@/lib/stores/authStore';
import { useFeature } from '@/lib/features';
import RankAvatar from './RankAvatar';
import styles from './BottomNav.module.css';

/**
 * Barre de navigation — quatre destinations.
 *
 *   Classement | (+) lancer une partie | Collection | Profil
 *
 * La Collection n'apparaît que si la V2 est livrée au joueur : la page
 * `/collection` renvoie vers `/profile` quand ce n'est pas le cas, et un onglet
 * qui rebondit est pire que pas d'onglet du tout. Avant ce changement, la page
 * n'était atteignable que par un bouton enfoui dans le profil.
 */
export default function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const v2Enabled = useFeature('v2');
    const packsUnopened = user?.packsUnopened ?? 0;

    const isLeaderboardActive = pathname === '/leaderboard';
    const isCollectionActive = pathname === '/collection';
    const isDashboardActive = pathname === '/dashboard' || pathname === '/game/new';
    const isProfileActive = pathname === '/profile';

    return (
        <div className={styles.navWrapper}>
            <nav className={styles.nav}>
                <Link href="/leaderboard"
                    className={`${styles.navItem} ${isLeaderboardActive ? styles.active : ''}`}
                    aria-current={isLeaderboardActive ? 'page' : undefined}
                >
                    <TrophyIcon className={styles.icon} />
                    <span className={styles.label}>Classement</span>
                </Link>

                {/* Lancer une partie — l'action principale, d'où le traitement à part. */}
                <Link href="/dashboard" className={styles.mainButton} aria-label="Lancer une partie">
                    <div className={`${styles.mainButtonInner} ${isDashboardActive ? styles.mainButtonActive : ''}`}>
                        <PlusIcon className={styles.mainIcon} />
                    </div>
                </Link>

                {v2Enabled && (
                    <Link href="/collection"
                        className={`${styles.navItem} ${isCollectionActive ? styles.active : ''}`}
                        aria-current={isCollectionActive ? 'page' : undefined}
                    >
                        <span className={styles.iconWrap}>
                            <Squares2X2Icon className={styles.icon} />
                            {/* Le compteur vit sur le document du joueur, déjà
                                suivi en temps réel par le store : la pastille
                                est gratuite, aucune lecture supplémentaire.
                                Elle disparaît d'elle-même à l'ouverture. */}
                            {packsUnopened > 0 && (
                                <span className={styles.badge}
                                    aria-label={`${packsUnopened} pack${packsUnopened > 1 ? 's' : ''} à ouvrir`}
                                >
                                    {packsUnopened > 9 ? '9+' : packsUnopened}
                                </span>
                            )}
                        </span>
                        <span className={styles.label}>Collection</span>
                    </Link>
                )}

                <Link href="/profile"
                    className={`${styles.navItem} ${isProfileActive ? styles.active : ''}`}
                    aria-current={isProfileActive ? 'page' : undefined}
                >
                    <RankAvatar elo={user?.stats?.elo} size="xs" />
                    <span className={styles.label}>Profil</span>
                </Link>
            </nav>
        </div>
    );
}
