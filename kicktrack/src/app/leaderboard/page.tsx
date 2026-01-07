'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getLeaderboard } from '@/lib/firebase/auth';
import { User } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function LeaderboardPage() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const data = await getLeaderboard(50);
            setUsers(data);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const top3 = users.slice(0, 3);
    const rest = users.slice(3);

    return (
        <div className={styles.container}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className={styles.title}>Classement</h1>
                </div>

                {/* Podium */}
                {users.length > 0 && (
                    <div className={styles.podium}>
                        {/* 2nd Place */}
                        {users[1] && (
                            <div className={`${styles.podiumSpot} ${styles.secondPlace}`}>
                                <div className={styles.avatarContainer}>
                                    <div className={styles.podiumAvatar}>
                                        {users[1].username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className={styles.podiumName}>{users[1].username}</div>
                                <div className={styles.podiumScore}>{users[1].stats.wins} victoires</div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {users[0] && (
                            <div className={`${styles.podiumSpot} ${styles.firstPlace}`}>
                                <div className={styles.avatarContainer}>
                                    <TrophyIcon className={styles.crownIcon} />
                                    <div className={styles.podiumAvatar}>
                                        {users[0].username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className={styles.podiumName}>{users[0].username}</div>
                                <div className={styles.podiumScore}>{users[0].stats.wins} victoires</div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {users[2] && (
                            <div className={`${styles.podiumSpot} ${styles.thirdPlace}`}>
                                <div className={styles.avatarContainer}>
                                    <div className={styles.podiumAvatar}>
                                        {users[2].username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className={styles.podiumName}>{users[2].username}</div>
                                <div className={styles.podiumScore}>{users[2].stats.wins} victoires</div>
                            </div>
                        )}
                    </div>
                )}

                {/* List */}
                <div className={styles.listContainer}>
                    <div className={styles.listHeader}>
                        <div className="text-center">#</div>
                        <div>Joueur</div>
                        <div className="text-center">V</div>
                        <div className="text-center">%</div>
                    </div>

                    {users.map((player, index) => (
                        <div
                            key={player.userId}
                            className={`${styles.listItem} ${currentUser?.userId === player.userId ? styles.currentUserItem : ''}`}
                        >
                            <div className={styles.rank}>{index + 1}</div>
                            <div className={styles.playerInfo}>
                                <div className={styles.listAvatar}>
                                    {player.username.charAt(0).toUpperCase()}
                                </div>
                                <span className={styles.playerName}>
                                    {player.username}
                                    {currentUser?.userId === player.userId && ' (Moi)'}
                                </span>
                            </div>
                            <div className={styles.statCol}>{player.stats.wins}</div>
                            <div className={`${styles.statCol} ${styles.winRate}`}>
                                {player.stats.totalGames > 0
                                    ? Math.round((player.stats.wins / player.stats.totalGames) * 100)
                                    : 0}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
