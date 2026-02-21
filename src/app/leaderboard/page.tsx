'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenueLeaderboard, getGlobalLeaderboard, getFriendsLeaderboard, LeaderboardEntry } from '@/lib/firebase/games';
import { getFriends } from '@/lib/firebase/friends';
import { Venue } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import BottomNav from '@/components/common/BottomNav';
import VenueDropdown from '@/components/venues/VenueDropdown';
import {
    ArrowLeftIcon,
    TrophyIcon,
    UsersIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

type FilterType = 'general' | 'friends';

export default function LeaderboardPage() {
    const router = useRouter();
    const { user: currentUser, initialize } = useAuthStore();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filter type state
    const [filterType, setFilterType] = useState<FilterType>('general');
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        loadFriendIds();
    }, [currentUser]);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedVenue, filterType, friendIds]);

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
            const venueId = selectedVenue?.venueId || 'all';
            if (filterType === 'friends') {
                const data = await getFriendsLeaderboard(friendIds, venueId);
                setLeaderboard(data);
            } else if (!selectedVenue) {
                const data = await getGlobalLeaderboard();
                setLeaderboard(data);
            } else {
                const data = await getVenueLeaderboard(selectedVenue.venueId);
                setLeaderboard(data);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Prepare leaderboard data with original rank
    const leaderboardWithRank = leaderboard.map((player, index) => ({
        ...player,
        originalRank: index + 1
    }));

    // Filter results based on search query
    const filteredLeaderboard = leaderboardWithRank.filter(player =>
        player.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isSearching = searchQuery.length > 0;
    const hasData = leaderboard.length > 0;
    const hasFilteredData = filteredLeaderboard.length > 0;

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

                {/* Search Bar */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchBar}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>

                {/* Venue Filter Dropdown */}
                <div className={styles.filterSection}>
                    <VenueDropdown
                        selectedVenue={selectedVenue}
                        onSelectVenue={setSelectedVenue}
                        showNoneOption={true}
                        noneLabel="Tous les stades"
                    />
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
                ) : !hasFilteredData ? (
                    <div className={styles.emptyState}>
                        Aucun joueur trouvé pour "{searchQuery}"
                    </div>
                ) : (
                    <>
                        {/* Podium - Only show when not searching */}
                        {!isSearching && filteredLeaderboard.length >= 3 && (
                            <div className={styles.podium}>
                                {/* 2nd Place */}
                                {filteredLeaderboard[1] && (
                                    <div
                                        className={`${styles.podiumSpot} ${styles.secondPlace} cursor-pointer`}
                                        onClick={() => router.push(`/profile/${filteredLeaderboard[1].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {filteredLeaderboard[1].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{filteredLeaderboard[1].username}</div>
                                        <div className={styles.podiumScore}>{filteredLeaderboard[1].elo || 1000} Elo</div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {filteredLeaderboard[0] && (
                                    <div
                                        className={`${styles.podiumSpot} ${styles.firstPlace} cursor-pointer`}
                                        onClick={() => router.push(`/profile/${filteredLeaderboard[0].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <TrophyIcon className={styles.crownIcon} />
                                            <div className={styles.podiumAvatar}>
                                                {filteredLeaderboard[0].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{filteredLeaderboard[0].username}</div>
                                        <div className={styles.podiumScore}>{filteredLeaderboard[0].elo || 1000} Elo</div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {filteredLeaderboard[2] && (
                                    <div
                                        className={`${styles.podiumSpot} ${styles.thirdPlace} cursor-pointer`}
                                        onClick={() => router.push(`/profile/${filteredLeaderboard[2].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <div className={styles.podiumAvatar}>
                                                {filteredLeaderboard[2].username.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={styles.podiumName}>{filteredLeaderboard[2].username}</div>
                                        <div className={styles.podiumScore}>{filteredLeaderboard[2].elo || 1000} Elo</div>
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
                                <div className="text-center">Elo</div>
                            </div>

                            {filteredLeaderboard.map((player) => (
                                <div
                                    key={player.userId}
                                    className={`${styles.listItem} ${currentUser?.userId === player.userId ? styles.currentUserItem : ''} cursor-pointer`}
                                    onClick={() => router.push(`/profile/${player.userId}`)}
                                >
                                    <div className={styles.rank}>{player.originalRank}</div>
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
                                        {player.elo || 1000}
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
