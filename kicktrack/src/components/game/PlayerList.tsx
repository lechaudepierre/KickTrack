'use client';

import { Player } from '@/types';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';
import styles from './PlayerList.module.css';

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
    currentUserId?: string;
}

export default function PlayerList({ players, maxPlayers, currentUserId }: PlayerListProps) {
    const emptySlots = maxPlayers - players.length;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.headerLabel}>Joueurs</span>
                <span className={styles.headerCount}>
                    {players.length}/{maxPlayers}
                </span>
            </div>

            <div className={styles.list}>
                {/* Joined players */}
                {players.map((player) => (
                    <div
                        key={player.userId}
                        className={`${styles.playerItem} ${player.userId === currentUserId ? styles.playerItemActive : styles.playerItemInactive}`}
                    >
                        <div className={styles.avatar}>
                            {player.username.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.playerInfo}>
                            <p className={styles.username}>
                                {player.username}
                                {player.userId === currentUserId && (
                                    <span className={styles.youLabel}>(vous)</span>
                                )}
                            </p>
                        </div>
                        <CheckCircleIcon className={styles.checkIcon} />
                    </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className={styles.emptySlot}
                    >
                        <div className={styles.emptyAvatar}>
                            <ClockIcon className={styles.clockIcon} />
                        </div>
                        <div className={styles.playerInfo}>
                            <p className={styles.emptyText}>En attente d&apos;un joueur...</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
