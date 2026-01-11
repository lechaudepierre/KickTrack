'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    searchUsersByUsername,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriendRequests,
    getFriends
} from '@/lib/firebase/friends';
import { User } from '@/types';
import BottomNav from '@/components/common/BottomNav';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    UserPlusIcon,
    CheckIcon,
    XMarkIcon,
    UserMinusIcon,
    ClockIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

type Tab = 'search' | 'requests' | 'friends';

export default function FriendsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [activeTab, setActiveTab] = useState<Tab>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [friendRequests, setFriendRequests] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, router]);

    // Load friend requests and friends on mount
    useEffect(() => {
        if (user) {
            loadFriendRequests();
            loadFriends();
        }
    }, [user]);

    // Search debounce
    useEffect(() => {
        if (!user || !searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchUsersByUsername(searchQuery, user.userId);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, user]);

    const loadFriendRequests = async () => {
        if (!user) return;
        try {
            const requests = await getFriendRequests(user.userId);
            setFriendRequests(requests);
        } catch (error) {
            console.error('Error loading friend requests:', error);
        }
    };

    const loadFriends = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const friendsList = await getFriends(user.userId);
            setFriends(friendsList);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
        setStatusMessage({ type, text });
        setTimeout(() => setStatusMessage(null), 3000);
    };

    const handleSendRequest = async (toUserId: string) => {
        if (!user || pendingActions.has(toUserId)) return;

        setPendingActions(prev => new Set(prev).add(toUserId));
        try {
            await sendFriendRequest(user.userId, toUserId);
            showStatus('success', 'Demande envoyee !');
            // Refresh data
            await Promise.all([loadFriendRequests(), loadFriends()]);
            // Re-run search to update button states
            if (searchQuery.trim()) {
                const results = await searchUsersByUsername(searchQuery, user.userId);
                setSearchResults(results);
            }
        } catch (error: any) {
            showStatus('error', error.message || 'Erreur');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(toUserId);
                return next;
            });
        }
    };

    const handleAcceptRequest = async (fromUserId: string) => {
        if (!user || pendingActions.has(fromUserId)) return;

        setPendingActions(prev => new Set(prev).add(fromUserId));
        try {
            await acceptFriendRequest(user.userId, fromUserId);
            showStatus('success', 'Ami ajoute !');
            await Promise.all([loadFriendRequests(), loadFriends()]);
        } catch (error: any) {
            showStatus('error', error.message || 'Erreur');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(fromUserId);
                return next;
            });
        }
    };

    const handleRejectRequest = async (fromUserId: string) => {
        if (!user || pendingActions.has(fromUserId)) return;

        setPendingActions(prev => new Set(prev).add(fromUserId));
        try {
            await rejectFriendRequest(user.userId, fromUserId);
            showStatus('success', 'Demande refusee');
            await loadFriendRequests();
        } catch (error: any) {
            showStatus('error', error.message || 'Erreur');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(fromUserId);
                return next;
            });
        }
    };

    const handleRemoveFriend = async (friendUserId: string) => {
        if (!user || pendingActions.has(friendUserId)) return;

        setPendingActions(prev => new Set(prev).add(friendUserId));
        try {
            await removeFriend(user.userId, friendUserId);
            showStatus('success', 'Ami retire');
            await loadFriends();
        } catch (error: any) {
            showStatus('error', error.message || 'Erreur');
        } finally {
            setPendingActions(prev => {
                const next = new Set(prev);
                next.delete(friendUserId);
                return next;
            });
        }
    };

    // Check relationship status with a user
    const getRelationshipStatus = (userId: string): 'friend' | 'pending_sent' | 'pending_received' | 'none' => {
        if (friends.some(f => f.userId === userId)) return 'friend';
        if (user?.friendRequestsSent?.includes(userId)) return 'pending_sent';
        if (friendRequests.some(r => r.userId === userId)) return 'pending_received';
        return 'none';
    };

    if (authLoading) {
        return (
            <div className="container-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                {/* Header */}
                <div className={styles.header}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className={styles.title}>Amis</h1>
                </div>

                {/* Status Message */}
                {statusMessage && (
                    <div className={`${styles.statusMessage} ${statusMessage.type === 'success' ? styles.successMessage : styles.errorMessage}`}>
                        {statusMessage.text}
                    </div>
                )}

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`${styles.tab} ${activeTab === 'search' ? styles.tabActive : ''}`}
                    >
                        Rechercher
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
                    >
                        Demandes
                        {friendRequests.length > 0 && (
                            <span className={styles.tabBadge}>{friendRequests.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`${styles.tab} ${activeTab === 'friends' ? styles.tabActive : ''}`}
                    >
                        Amis
                    </button>
                </div>

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <>
                        <div className={styles.searchSection}>
                            <div className={styles.searchInputWrapper}>
                                <MagnifyingGlassIcon className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un joueur..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {isSearching ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner} />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className={styles.section}>
                                <p className={styles.sectionTitle}>Resultats</p>
                                <div className={styles.userList}>
                                    {searchResults.map((searchUser) => {
                                        const status = getRelationshipStatus(searchUser.userId);
                                        return (
                                            <div key={searchUser.userId} className={styles.userCard}>
                                                <div className={styles.userAvatar}>
                                                    {searchUser.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={styles.userInfo}>
                                                    <p className={styles.userName}>{searchUser.username}</p>
                                                    <p className={styles.userStats}>
                                                        {searchUser.stats.wins} victoires
                                                    </p>
                                                </div>
                                                <div className={styles.userActions}>
                                                    {status === 'none' && (
                                                        <button
                                                            onClick={() => handleSendRequest(searchUser.userId)}
                                                            className={`${styles.actionBtn} ${styles.addBtn}`}
                                                            disabled={pendingActions.has(searchUser.userId)}
                                                        >
                                                            <UserPlusIcon className={styles.actionIcon} />
                                                        </button>
                                                    )}
                                                    {status === 'pending_sent' && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.pendingBtn}`}
                                                            disabled
                                                        >
                                                            <ClockIcon className={styles.actionIcon} />
                                                        </button>
                                                    )}
                                                    {status === 'pending_received' && (
                                                        <button
                                                            onClick={() => handleAcceptRequest(searchUser.userId)}
                                                            className={`${styles.actionBtn} ${styles.acceptBtn}`}
                                                            disabled={pendingActions.has(searchUser.userId)}
                                                        >
                                                            <CheckIcon className={styles.actionIcon} />
                                                        </button>
                                                    )}
                                                    {status === 'friend' && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.pendingBtn}`}
                                                            disabled
                                                        >
                                                            <CheckIcon className={styles.actionIcon} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : searchQuery.trim() ? (
                            <div className={styles.emptyState}>
                                <MagnifyingGlassIcon className={styles.emptyIcon} />
                                <p>Aucun joueur trouve</p>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <UsersIcon className={styles.emptyIcon} />
                                <p>Tape un pseudo pour rechercher</p>
                            </div>
                        )}
                    </>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <>
                        {friendRequests.length > 0 ? (
                            <div className={styles.section}>
                                <p className={styles.sectionTitle}>Demandes en attente</p>
                                <div className={styles.userList}>
                                    {friendRequests.map((request) => (
                                        <div key={request.userId} className={styles.userCard}>
                                            <div className={styles.userAvatar}>
                                                {request.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={styles.userInfo}>
                                                <p className={styles.userName}>{request.username}</p>
                                                <p className={styles.userStats}>
                                                    {request.stats.wins} victoires
                                                </p>
                                            </div>
                                            <div className={styles.userActions}>
                                                <button
                                                    onClick={() => handleAcceptRequest(request.userId)}
                                                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                                                    disabled={pendingActions.has(request.userId)}
                                                >
                                                    <CheckIcon className={styles.actionIcon} />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectRequest(request.userId)}
                                                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                                                    disabled={pendingActions.has(request.userId)}
                                                >
                                                    <XMarkIcon className={styles.actionIcon} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <UserPlusIcon className={styles.emptyIcon} />
                                <p>Aucune demande en attente</p>
                            </div>
                        )}
                    </>
                )}

                {/* Friends Tab */}
                {activeTab === 'friends' && (
                    <>
                        {isLoading ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner} />
                            </div>
                        ) : friends.length > 0 ? (
                            <div className={styles.section}>
                                <p className={styles.sectionTitle}>{friends.length} ami{friends.length > 1 ? 's' : ''}</p>
                                <div className={styles.userList}>
                                    {friends.map((friend) => (
                                        <div key={friend.userId} className={styles.userCard}>
                                            <div className={styles.userAvatar}>
                                                {friend.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={styles.userInfo}>
                                                <p className={styles.userName}>{friend.username}</p>
                                                <p className={styles.userStats}>
                                                    {friend.stats.wins} victoires - {friend.stats.totalGames} parties
                                                </p>
                                            </div>
                                            <div className={styles.userActions}>
                                                <button
                                                    onClick={() => handleRemoveFriend(friend.userId)}
                                                    className={`${styles.actionBtn} ${styles.removeBtn}`}
                                                    disabled={pendingActions.has(friend.userId)}
                                                >
                                                    <UserMinusIcon className={styles.actionIcon} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <UsersIcon className={styles.emptyIcon} />
                                <p>Tu n'as pas encore d'amis</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
