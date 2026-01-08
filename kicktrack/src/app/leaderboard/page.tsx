'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getLeaderboard } from '@/lib/firebase/auth';
import { getVenues } from '@/lib/firebase/firestore';
import { getVenueLeaderboard, VenueLeaderboardEntry } from '@/lib/firebase/games';
import { User, Venue } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    TrophyIcon,
    ChevronDownIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function LeaderboardPage() {
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [venueLeaderboard, setVenueLeaderboard] = useState<VenueLeaderboardEntry[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadVenues();
    }, []);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedVenue]);

    const loadVenues = async () => {
        try {
            const data = await getVenues();
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            if (selectedVenue === 'all') {
                const data = await getLeaderboard(50);
                setUsers(data);
                setVenueLeaderboard([]);
            } else {
                const data = await getVenueLeaderboard(selectedVenue);
                setVenueLeaderboard(data);
                setUsers([]);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getSelectedVenueName = () => {
        if (selectedVenue === 'all') return 'Tous les lieux';
        const venue = venues.find(v => v.venueId === selectedVenue);
        return venue?.name || 'Sélectionner';
    };

    const handleVenueSelect = (venueId: string) => {
        setSelectedVenue(venueId);
        setIsDropdownOpen(false);
    };

    // Get the display data based on selection
    const displayData = selectedVenue === 'all' ? users : venueLeaderboard;
    const hasData = displayData.length > 0;

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

                {/* Venue Filter Dropdown */}
                <div className={styles.filterSection}>
                    <div className={styles.dropdownContainer}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={styles.dropdownButton}
                        >
                            <MapPinIcon className="w-5 h-5" />
                            <span>{getSelectedVenueName()}</span>
                            <ChevronDownIcon className={`w-5 h-5 ${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <button
                                    onClick={() => handleVenueSelect('all')}
                                    className={`${styles.dropdownItem} ${selectedVenue === 'all' ? styles.dropdownItemActive : ''}`}
                                >
                                    Tous les lieux
                                </button>
                                {venues.map(venue => (
                                    <button
                                        key={venue.venueId}
                                        onClick={() => handleVenueSelect(venue.venueId)}
                                        className={`${styles.dropdownItem} ${selectedVenue === venue.venueId ? styles.dropdownItemActive : ''}`}
                                    >
                                        {venue.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !hasData ? (
                    <div className={styles.emptyState}>
                        Aucun classement disponible pour ce lieu
                    </div>
                ) : (
                    <>
                        {/* Podium - Global leaderboard only */}
                        {selectedVenue === 'all' && users.length > 0 && (
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

                        {/* Podium - Venue leaderboard */}
                        {selectedVenue !== 'all' && venueLeaderboard.length > 0 && (
                            <div className={styles.podium}>
                                {/* 2nd Place */}
                                {venueLeaderboard[1] && (
                                    <div className={`${styles.podiumSpot} ${styles.secondPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {venueLeaderboard[1].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{venueLeaderboard[1].username}</div>
                                        <div className={styles.podiumScore}>{venueLeaderboard[1].wins} victoires</div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {venueLeaderboard[0] && (
                                    <div className={`${styles.podiumSpot} ${styles.firstPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <TrophyIcon className={styles.crownIcon} />
                                            <div className={styles.podiumAvatar}>
                                                {venueLeaderboard[0].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{venueLeaderboard[0].username}</div>
                                        <div className={styles.podiumScore}>{venueLeaderboard[0].wins} victoires</div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {venueLeaderboard[2] && (
                                    <div className={`${styles.podiumSpot} ${styles.thirdPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {venueLeaderboard[2].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{venueLeaderboard[2].username}</div>
                                        <div className={styles.podiumScore}>{venueLeaderboard[2].wins} victoires</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* List - Global */}
                        {selectedVenue === 'all' && (
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
                        )}

                        {/* List - Venue */}
                        {selectedVenue !== 'all' && (
                            <div className={styles.listContainer}>
                                <div className={styles.listHeader}>
                                    <div className="text-center">#</div>
                                    <div>Joueur</div>
                                    <div className="text-center">V</div>
                                    <div className="text-center">%</div>
                                </div>

                                {venueLeaderboard.map((player, index) => (
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
                                        <div className={styles.statCol}>{player.wins}</div>
                                        <div className={`${styles.statCol} ${styles.winRate}`}>
                                            {player.totalGames > 0
                                                ? Math.round(player.winRate * 100)
                                                : 0}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
