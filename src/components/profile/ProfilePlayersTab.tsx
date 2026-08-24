/**
 * Onglet « Avec & Contre » du profil.
 *
 * Nommé ainsi et non « Adversaires » : il contient le podium des COÉQUIPIERS
 * autant que le face-à-face. Le nommer par la moitié de son contenu aurait
 * caché l'autre moitié.
 *
 * Extrait de `ProfileContent` lors de la refonte du profil (chantier 9.3).
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserGroupIcon, UsersIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { AdvancedStats } from '@/lib/utils/statsCalculator';
import RankAvatar from '@/components/common/RankAvatar';
import styles from './ProfileContent.module.css';

/** Coéquipier le plus fréquent, tel que calculé par le profil. */
export interface TopTeammate {
    userId: string;
    username: string;
    games: number;
    wins: number;
}

interface ProfilePlayersTabProps {
    advancedStats: AdvancedStats;
    /** Coéquipiers les plus fréquents, déjà triés. */
    topTeammates: TopTeammate[];
    teammateElos: Map<string, number>;
    /** Filtre de format actif, pour adapter le libellé de la section. */
    modeFilter: '1v1' | '2v2' | 'all';
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

export default function ProfilePlayersTab({
    advancedStats,
    topTeammates,
    teammateElos,
    modeFilter,
    searchQuery,
    onSearchChange,
}: ProfilePlayersTabProps) {
    const router = useRouter();

    // Le filtrage de la recherche vit ici, avec l'affichage qu'il pilote.
    // Il était calculé dans ProfileContent, qui n'en faisait rien d'autre.
    const filteredH2H = useMemo(() => {
        const list = searchQuery.trim()
            ? advancedStats.headToHead.filter(h2h =>
                h2h.opponentName.toLowerCase().includes(searchQuery.toLowerCase()))
            : advancedStats.headToHead;
        return list.slice(0, 5);
    }, [advancedStats, searchQuery]);

    return (
        <>
                    {/* Top Teammates Podium */}
                    {modeFilter !== '1v1' && topTeammates.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <UserPlusIcon width={20} height={20} />
                                Duo de Choc (2v2)
                            </h3>
                            <div className={styles.podiumCard}>
                                <div className={styles.podium}>
                                    {/* 2nd place - left */}
                                    {topTeammates[1] ? (
                                        <div className={`${styles.podiumSpot}`} onClick={() => router.push(`/profile/${topTeammates[1].userId}`)}>
                                            <RankAvatar size="md" elo={teammateElos.get(topTeammates[1].userId)} />
                                            <span className={styles.podiumName}>{topTeammates[1].username}</span>
                                            <span className={styles.podiumWins}>{topTeammates[1].wins}V</span>
                                            <span className={styles.podiumGames}>{topTeammates[1].games} matchs</span>
                                            <div className={`${styles.podiumBar} ${styles.podiumBar2}`}>2</div>
                                        </div>
                                    ) : (
                                        <div className={styles.podiumSpot} />
                                    )}

                                    {/* 1st place - center */}
                                    <div className={`${styles.podiumSpot}`} onClick={() => router.push(`/profile/${topTeammates[0].userId}`)}>
                                        <RankAvatar size="lg" elo={teammateElos.get(topTeammates[0].userId)} />
                                        <span className={styles.podiumName}>{topTeammates[0].username}</span>
                                        <span className={styles.podiumWins}>{topTeammates[0].wins}V</span>
                                        <span className={styles.podiumGames}>{topTeammates[0].games} matchs</span>
                                        <div className={`${styles.podiumBar} ${styles.podiumBar1}`}>1</div>
                                    </div>

                                    {/* 3rd place - right */}
                                    {topTeammates[2] ? (
                                        <div className={`${styles.podiumSpot}`} onClick={() => router.push(`/profile/${topTeammates[2].userId}`)}>
                                            <RankAvatar size="md" elo={teammateElos.get(topTeammates[2].userId)} />
                                            <span className={styles.podiumName}>{topTeammates[2].username}</span>
                                            <span className={styles.podiumWins}>{topTeammates[2].wins}V</span>
                                            <span className={styles.podiumGames}>{topTeammates[2].games} matchs</span>
                                            <div className={`${styles.podiumBar} ${styles.podiumBar3}`}>3</div>
                                        </div>
                                    ) : (
                                        <div className={styles.podiumSpot} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Head-to-Head */}
                    {advancedStats.headToHead.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <UsersIcon width={20} height={20} />
                                Face à Face
                            </h3>
                            <div className={styles.h2hSearch}>
                                <MagnifyingGlassIcon className={styles.h2hSearchIcon} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un adversaire..."
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className={styles.h2hSearchInput}
                                />
                            </div>
                            <div className={styles.h2hList}>
                                {filteredH2H.map((h2h) => (
                                    <div key={h2h.opponentId} className={`${styles.h2hCard}`} onClick={() => router.push(`/profile/${h2h.opponentId}`)}>
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
    );
}
