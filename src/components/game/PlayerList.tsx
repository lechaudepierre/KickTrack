'use client';

import { Player } from '@/types';
import { CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/solid';
import styles from './PlayerList.module.css';
import RankAvatar from '@/components/common/RankAvatar';
import PlayerBanner from '@/components/common/PlayerBanner';
import { resolveBannerId, getBannerConfig } from '@/lib/utils/bannerUtils';

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
    currentUserId?: string;
    hostId?: string;
    onKick?: (userId: string) => void;
}

export default function PlayerList({ players, maxPlayers, currentUserId, hostId, onKick }: PlayerListProps) {
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
                {players.map((player) => {
                    const hasBanner = !!getBannerConfig(resolveBannerId(player.username));
                    const canKick = !!onKick && player.userId !== currentUserId;
                    return (
                    <PlayerBanner
                        key={player.userId}
                        username={player.username}
                        className={`${styles.playerItem} ${hasBanner ? styles.playerItemBanner : player.userId === currentUserId ? styles.playerItemActive : styles.playerItemInactive}`}
                    >
                        <RankAvatar size="md" />
                        <div className={styles.playerInfo}>
                            <p className={`${styles.username} ${hasBanner ? styles.usernameOnBanner : ''}`}>
                                {player.username}
                                {player.userId === currentUserId && (
                                    <span className={styles.youLabel}>(vous)</span>
                                )}
                                {player.userId === hostId && (
                                    <span className={styles.hostLabel}>hôte</span>
                                )}
                            </p>
                        </div>
                        {canKick ? (
                            <button
                                onClick={() => onKick(player.userId)}
                                className={styles.kickButton}
                                title="Exclure"
                            >
                                <XMarkIcon className={styles.kickIcon} />
                            </button>
                        ) : (
                            <CheckCircleIcon className={`${styles.checkIcon} ${hasBanner ? styles.checkIconOnBanner : ''}`} />
                        )}
                    </PlayerBanner>
                    );
                })}

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
