'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenues } from '@/lib/firebase/firestore';
import { getVenueLeaderboard, getGlobalLeaderboard, getFriendsLeaderboard, LeaderboardEntry } from '@/lib/firebase/games';
import { getFriends } from '@/lib/firebase/friends';
import { Venue } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import BottomNav from '@/components/common/BottomNav';
import {
    ArrowLeftIcon,
    TrophyIcon,
    ChevronDownIcon,
    MapPinIcon,
    UsersIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

type FilterType = 'general' | 'friends';

export default function LeaderboardPage() {
    const router = useRouter();
    const { user: currentUser, initialize } = useAuthStore();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Filter type state
    const [filterType, setFilterType] = useState<FilterType>('general');
    const [friendIds, setFriendIds] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        loadVenues();
        loadFriendIds();
    }, [currentUser]);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedVenue, filterType, friendIds]);

    const loadVenues = async () => {
        try {
            const data = await getVenues();
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const loadFriendIds = async () => {
        if (!currentUser) return;
        try {
            const friends = await getFriends(currentUser.userId);
            // Include current user in the list for friends leaderboard
            setFriendIds([currentUser.userId, ...friends.map(f => f.userId)]);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    };

    const loadLeaderboard = async () => {
        setIsLoading(true);
        try {
            if (filterType === 'friends') {
                const data = await getFriendsLeaderboard(friendIds, selectedVenue);
                setLeaderboard(data);
            } else if (selectedVenue === 'all') {
                const data = await getGlobalLeaderboard();
                setLeaderboard(data);
            } else {
                const data = await getVenueLeaderboard(selectedVenue);
                setLeaderboard(data);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getSelectedVenueName = () => {
        if (selectedVenue === 'all') return 'Tous les stades';
        const venue = venues.find(v => v.venueId === selectedVenue);
        return venue?.name || 'Sélectionner';
    };

    const handleVenueSelect = (venueId: string) => {
        setSelectedVenue(venueId);
        setIsDropdownOpen(false);
    };

    const hasData = leaderboard.length > 0;

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Classement</h1>
                </div>

                {/* Filter Type Tabs */}
                <div className={styles.filterTabs}>
                    <button
                        onClick={() => setFilterType('general')}
                        className={`${styles.filterTab} ${filterType === 'general' ? styles.filterTabActive : ''}`}
                    >
                        <GlobeAltIcon className="w-5 h-5" />
                        <span>General</span>
                    </button>
                    <button
                        onClick={() => setFilterType('friends')}
                        className={`${styles.filterTab} ${filterType === 'friends' ? styles.filterTabActive : ''}`}
                    >
                        <UsersIcon className="w-5 h-5" />
                        <span>Amis</span>
                    </button>
                </div>

                {/* Venue Filter Dropdown - Show for both filters */}
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
                                    Tous les stades
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
                        {filterType === 'friends'
                            ? 'Ajoute des amis pour voir leur classement !'
                            : 'Aucun classement disponible pour ce stade'
                        }
                    </div>
                ) : (
                    <>
                        {/* Podium */}
                        {leaderboard.length > 0 && (
                            <div className={styles.podium}>
                                {/* 2nd Place */}
                                {leaderboard[1] && (
                                    <div className={`${styles.podiumSpot} ${styles.secondPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {leaderboard[1].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[1].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[1].wins} victoires</div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {leaderboard[0] && (
                                    <div className={`${styles.podiumSpot} ${styles.firstPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <TrophyIcon className={styles.crownIcon} />
                                            <div className={styles.podiumAvatar}>
                                                {leaderboard[0].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[0].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[0].wins} victoires</div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {leaderboard[2] && (
                                    <div className={`${styles.podiumSpot} ${styles.thirdPlace}`}>
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {leaderboard[2].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[2].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[2].wins} victoires</div>
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

                            {leaderboard.map((player, index) => (
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
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
