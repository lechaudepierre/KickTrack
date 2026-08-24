'use client';

import { Player } from '@/types';
import { CheckCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/solid';
import styles from './PlayerList.module.css';
import PlayerRow from '@/components/common/PlayerRow';
import { useCatalog } from '@/lib/collection/catalogClient';
import { usePlayerProfiles } from '@/lib/firebase/usePlayerProfiles';

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
    currentUserId?: string;
    onKick?: (userId: string) => void;
}

export default function PlayerList({ players, maxPlayers, currentUserId, onKick }: PlayerListProps) {
    // Le catalogue doit être chargé pour que `resolveBanner` réponde juste.
    useCatalog();
    // Une partie ne stocke que l'identité des joueurs. L'ELO, la bannière
    // équipée et le titre vivent sur leur profil — sans ça, tout le monde
    // s'affichait au même grade avec la mauvaise bannière.
    const profils = usePlayerProfiles(players.map(p => p.userId), { withRank: true });

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
                    const canKick = !!onKick && player.userId !== currentUserId;
                    return (
                        <PlayerRow key={player.userId}
                            username={player.username}
                            profile={profils[player.userId]}
                            className={player.userId === currentUserId ? styles.playerItemActive : ''}
                            trailing={canKick ? (
                                <button onClick={() => onKick(player.userId)}
                                    className={styles.kickButton}
                                    title="Exclure"
                                >
                                    <XMarkIcon className={styles.kickIcon} />
                                </button>
                            ) : (
                                <CheckCircleIcon className={styles.checkIcon} />
                            )}
                        />
                    );
                })}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`}
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
