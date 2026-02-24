'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserById, checkUsernameAvailable, updateUsername } from '@/lib/firebase/auth';
import { getUserGames } from '@/lib/firebase/games';
import { getFriendRequestCount } from '@/lib/firebase/friends';
import { getAnnouncements, countUnread } from '@/lib/firebase/announcements';
import { Game, Venue, User, Announcement } from '@/types';
import VenueDropdown from '@/components/venues/VenueDropdown';
import BottomNav from '@/components/common/BottomNav';
import { calculateAdvancedStats, getPositionLabel, AdvancedStats } from '@/lib/utils/statsCalculator';
import {
    ClockIcon,
    MapPinIcon,
    FireIcon,
    TrophyIcon,
    ChartBarIcon,
    MagnifyingGlassIcon,
    ArrowRightOnRectangleIcon,
    InformationCircleIcon,
    PencilIcon,
    XMarkIcon,
    UserPlusIcon,
    BellIcon,
    UsersIcon,
    ArrowLeftIcon,
    CheckIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import styles from './ProfileContent.module.css';
import RankAvatar from '@/components/common/RankAvatar';
import PlayerBanner from '@/components/common/PlayerBanner';
import { getRankInfo } from '@/lib/utils/rankUtils';
import { CREATOR_USERNAMES } from '@/lib/utils/bannerUtils';

interface ProfileContentProps {
    targetUserId: string;
    isMe?: boolean;
}

export default function ProfileContent({ targetUserId, isMe = false }: ProfileContentProps) {
    const router = useRouter();
    const { user: currentUser, logout } = useAuthStore();

    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);

    // Filters state
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [modeFilter, setModeFilter] = useState<'1v1' | '2v2' | 'all'>('all');

    // Head-to-head search state
    const [h2hSearchQuery, setH2hSearchQuery] = useState('');

    // Info modal state
    const [showRemontadaInfo, setShowRemontadaInfo] = useState(false);

    // Username update state (only for Me)
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    // Friend requests count (only for Me)
    const [friendRequestsCount, setFriendRequestsCount] = useState(0);
    // Announcements list for reactive unread count
    const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
    const [teammateElos, setTeammateElos] = useState<Map<string, number>>(new Map());

    // Reactive unread count — recalculates automatically when user.readAnnouncementIds changes
    const unreadNotifCount = useMemo(() => {
        const readIds = currentUser?.readAnnouncementIds || [];
        return countUnread(allAnnouncements, readIds);
    }, [allAnnouncements, currentUser?.readAnnouncementIds]);

    // Relationship status (only for !isMe)
    const [relationshipStatus, setRelationshipStatus] = useState<'none' | 'pending' | 'friend'>('none');
    const [isActionPending, setIsActionPending] = useState(false);

    useEffect(() => {
        loadProfileData();
    }, [targetUserId]);

    const loadProfileData = async () => {
        setIsLoading(true);
        try {
            const [userData, gamesData] = await Promise.all([
                getUserById(targetUserId),
                getUserGames(targetUserId, 200)
            ]);

            setProfileUser(userData);
            setAllGames(gamesData);

            if (isMe) {
                const count = await getFriendRequestCount(targetUserId);
                setFriendRequestsCount(count);

                const announcements = await getAnnouncements();
                setAllAnnouncements(announcements);
            } else if (currentUser) {
                // Check relationship status
                if (currentUser.friends?.includes(targetUserId)) {
                    setRelationshipStatus('friend');
                } else if (currentUser.friendRequestsSent?.includes(targetUserId)) {
                    setRelationshipStatus('pending');
                } else {
                    setRelationshipStatus('none');
                }
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Recalculate stats when filters change
    useEffect(() => {
        if (profileUser && allGames.length > 0) {
            const stats = calculateAdvancedStats(allGames, profileUser.userId, {
                venueId: selectedVenue?.venueId,
                mode: modeFilter
            });
            setAdvancedStats(stats);

            // Update recent games based on filters
            const filtered = allGames.filter(g => {
                if (selectedVenue && g.venueId !== selectedVenue.venueId) return false;
                if (modeFilter !== 'all') {
                    const is2v2 = g.teams[0].players.length + g.teams[1].players.length === 4;
                    if (modeFilter === '1v1' && is2v2) return false;
                    if (modeFilter === '2v2' && !is2v2) return false;
                }
                return true;
            });
            setRecentGames(filtered.slice(0, 5));
        } else if (profileUser && allGames.length === 0) {
            // Still need basic empty stats if no games
            setAdvancedStats(calculateAdvancedStats([], profileUser.userId));
            setRecentGames([]);
        }
    }, [selectedVenue, modeFilter, allGames, profileUser]);

    // Filter head-to-head based on search
    const filteredH2H = useMemo(() => {
        if (!advancedStats) return [];
        const list = h2hSearchQuery.trim()
            ? advancedStats.headToHead.filter(h2h => h2h.opponentName.toLowerCase().includes(h2hSearchQuery.toLowerCase()))
            : advancedStats.headToHead;
        return list.slice(0, 5);
    }, [advancedStats, h2hSearchQuery]);

    // Top 3 teammates by wins in 2v2
    const topTeammates = useMemo(() => {
        if (!profileUser || allGames.length === 0) return [];

        const teammateMap = new Map<string, { username: string; wins: number; games: number }>();

        for (const game of allGames) {
            if (game.status !== 'completed') continue;

            const userTeam = game.teams.find(t => t.players.some(p => p.userId === profileUser.userId));
            if (!userTeam || userTeam.players.length < 2) continue;

            const teammate = userTeam.players.find(p => p.userId !== profileUser.userId);
            if (!teammate) continue;

            const existing = teammateMap.get(teammate.userId) || { username: teammate.username, wins: 0, games: 0 };
            existing.games++;

            const userTeamIndex = game.teams.indexOf(userTeam);
            if (game.winner === userTeamIndex) {
                existing.wins++;
            }

            teammateMap.set(teammate.userId, existing);
        }

        return Array.from(teammateMap.entries())
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.wins - a.wins || b.games - a.games)
            .slice(0, 3);
    }, [allGames, profileUser]);

    // Fetch ELO for each top teammate
    useEffect(() => {
        if (topTeammates.length === 0) return;
        const fetchElos = async () => {
            const map = new Map<string, number>();
            await Promise.all(topTeammates.map(async (t) => {
                try {
                    const u = await getUserById(t.userId);
                    if (u) map.set(t.userId, u.stats?.elo ?? 1000);
                } catch { /* ignore */ }
            }));
            setTeammateElos(map);
        };
        fetchElos();
    }, [topTeammates]);

    if (isLoading) {
        return (
            <div className="container-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <p className={styles.emptyState}>Joueur non trouvé</p>
                    <button onClick={() => router.back()} className="btn-primary mt-4">
                        <div className="btn-primary-content">Retour</div>
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (date: Date | any) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date.seconds * 1000);
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(d);
    };

    const getGameResult = (game: Game) => {
        if (game.winner === undefined) return 'Nul';
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === profileUser.userId));
        if (userTeamIndex === -1) return '?';
        return game.winner === userTeamIndex ? 'Victoire' : 'Défaite';
    };

    const getOpponentNames = (game: Game) => {
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === profileUser.userId));
        if (userTeamIndex === -1) return '';
        const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
        return game.teams[opponentTeamIndex].players.map(p => p.username).join(' & ');
    };

    const getTeammateName = (game: Game) => {
        const userTeam = game.teams.find(t => t.players.some(p => p.userId === profileUser.userId));
        if (!userTeam || userTeam.players.length < 2) return null;
        const teammate = userTeam.players.find(p => p.userId !== profileUser.userId);
        return teammate?.username || null;
    };

    const getEloChange = (game: Game) => {
        if (!game.eloChanges || !game.eloChanges[profileUser.userId]) return null;
        return game.eloChanges[profileUser.userId].eloChange;
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const handleAddFriend = async () => {
        if (!currentUser || isActionPending) return;
        setIsActionPending(true);
        try {
            const { sendFriendRequest } = await import('@/lib/firebase/friends');
            await sendFriendRequest(currentUser.userId, targetUserId);
            setRelationshipStatus('pending');
        } catch (error) {
            console.error('Error sending friend request:', error);
        } finally {
            setIsActionPending(false);
        }
    };

    const handleUpdateUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isMe || !profileUser || !newUsername.trim() || newUsername.trim() === profileUser.username) {
            setShowUpdateModal(false);
            return;
        }
        setIsUpdating(true);
        setUpdateError('');
        try {
            const isAvailable = await checkUsernameAvailable(newUsername.trim(), profileUser.userId);
            if (!isAvailable) {
                setUpdateError('Ce pseudo est déjà pris');
                setIsUpdating(false);
                return;
            }
            await updateUsername(profileUser.userId, newUsername.trim());
            setProfileUser({ ...profileUser, username: newUsername.trim() });
            setShowUpdateModal(false);
        } catch (error) {
            console.error('Error updating username:', error);
            setUpdateError('Erreur lors de la mise à jour');
        } finally {
            setIsUpdating(false);
        }
    };

    const openUpdateModal = () => {
        if (!isMe) return;
        setNewUsername(profileUser.username);
        setUpdateError('');
        setShowUpdateModal(true);
    };

    // Elo Chart Component
    const EloChart = ({ data }: { data: Array<{ date: string, elo: number }> }) => {
        if (data.length < 2) return <div className={styles.chartEmpty}>Pas assez de données pour le graphique</div>;

        const width = 300;
        const height = 120;
        const padX = 20;
        const padY = 25;

        const values = data.map(d => d.elo);
        const minElo = Math.min(...values);
        const maxElo = Math.max(...values);

        const range = maxElo - minElo;
        const displayRange = range === 0 ? 40 : range;
        const displayMin = range === 0 ? minElo - 20 : minElo;

        const getX = (i: number) => (i / (data.length - 1)) * (width - 2 * padX) + padX;
        const getY = (val: number) => height - (((val - displayMin) / displayRange) * (height - 2 * padY) + padY);

        const points = data.map((d, i) => `${getX(i)},${getY(d.elo)}`).join(' ');

        return (
            <div className={styles.chartContainer}>
                <div className={styles.chartEloLegend}>
                    <span className="text-[0.6rem] font-black">{Math.round(maxElo)}</span>
                    <span className="text-[0.6rem] font-black">{Math.round(minElo)}</span>
                </div>
                <svg viewBox={`0 0 ${width} ${height}`} className={styles.svgChart}>
                    {/* Grid lines (min/max) */}
                    <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="rgba(51,51,51,0.05)" strokeDasharray="2" />
                    <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="rgba(51,51,51,0.05)" strokeDasharray="2" />

                    {/* The line */}
                    <polyline
                        fill="none"
                        stroke="var(--color-green-medium)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                    />

                    {/* Dots and Labels */}
                    {data.map((d, i) => {
                        const x = getX(i);
                        const y = getY(d.elo);
                        const isLast = i === data.length - 1;
                        return (
                            <g key={i}>
                                <circle cx={x} cy={y} r="3" fill="#333" />
                                {isLast && (
                                    <g>
                                        <rect x={x - 15} y={y - 20} width="30" height="14" rx="4" fill="#333" />
                                        <text x={x} y={y - 10} fontSize="9" fontWeight="900" textAnchor="middle" fill="white">
                                            {Math.round(d.elo)}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
                <div className={styles.chartLabels}>
                    <span className="text-[0.65rem] opacity-40 font-black uppercase">{data[0].date}</span>
                    <span className="text-[0.7rem] font-black uppercase tracking-tight text-green-700">Progression Elo (20p)</span>
                    <span className="text-[0.65rem] opacity-40 font-black uppercase">{data[data.length - 1].date}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {!isMe && (
                            <button onClick={() => router.back()} className={styles.backButton}>
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                        )}
                        <h1 className={styles.title}>{isMe ? 'Tableau de Bord' : 'Profil'}</h1>
                    </div>

                    <div className={styles.headerActions}>
                        {isMe ? (
                            <>
                                <button onClick={() => router.push('/friends')} className={styles.friendRequestsBtn}>
                                    <UsersIcon className={styles.logoutIcon} />
                                    {friendRequestsCount > 0 && (
                                        <span className={styles.friendRequestsBadge}>{friendRequestsCount}</span>
                                    )}
                                </button>
                                <button onClick={() => router.push('/notifications')} className={styles.notifBtn}>
                                    <BellIcon className={styles.logoutIcon} />
                                    {unreadNotifCount > 0 && (
                                        <span className={styles.notifBadge}>
                                            {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                        </span>
                                    )}
                                </button>
                                <button onClick={handleLogout} className={styles.logoutBtn}>
                                    <ArrowRightOnRectangleIcon className={styles.logoutIcon} />
                                </button>
                            </>
                        ) : (
                            <>
                                {relationshipStatus === 'none' && (
                                    <button
                                        onClick={handleAddFriend}
                                        className={styles.addFriendBtn}
                                        disabled={isActionPending}
                                    >
                                        <UserPlusIcon className="w-5 h-5 mr-2" />
                                        <span>Ajouter</span>
                                    </button>
                                )}
                                {relationshipStatus === 'pending' && (
                                    <button className={styles.pendingBtn} disabled>
                                        <ClockIcon className="w-5 h-5 mr-2" />
                                        <span>En attente</span>
                                    </button>
                                )}
                                {relationshipStatus === 'friend' && (
                                    <div className={styles.friendBadge}>
                                        <CheckIcon className="w-5 h-5 mr-2" />
                                        <span>Ami</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <PlayerBanner
                    username={profileUser.username}
                    bannerId={profileUser.bannerId}
                    className={`${styles.profileHeader} ${styles.profileBannerBlock}`}
                >
                    <RankAvatar elo={profileUser.stats.elo} size="md" />
                    <div className={styles.userInfo}>
                        <div className={styles.usernameContainer}>
                            <h2 className={styles.username}>
                                {profileUser.username}
                            </h2>
                            {isMe && (
                                <button onClick={openUpdateModal} className={styles.editBtn}>
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className={styles.eloRankLine}>
                            {profileUser.stats.elo || 1000} Elo
                            {' – '}
                            {(() => { const r = getRankInfo(profileUser.stats.elo); return `${r.label} ${r.romanLevel}`; })()}
                        </p>
                    </div>
                </PlayerBanner>
                <p className={styles.joinDate}>
                    {CREATOR_USERNAMES.includes(profileUser.username) ? 'CREATOR' : `Membre depuis ${formatDate(profileUser.createdAt)}`}
                </p>

                {/* Filters Section */}
                <div className={styles.filterSection}>
                    <div className={styles.filterRow}>
                        <div className={styles.segmentedControl}>
                            <button
                                className={`${styles.segment} ${modeFilter === 'all' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('all')}
                            >Tous</button>
                            <button
                                className={`${styles.segment} ${modeFilter === '1v1' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('1v1')}
                            >1v1</button>
                            <button
                                className={`${styles.segment} ${modeFilter === '2v2' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('2v2')}
                            >2v2</button>
                        </div>
                    </div>
                    <VenueDropdown
                        selectedVenue={selectedVenue}
                        onSelectVenue={setSelectedVenue}
                        showNoneOption={true}
                        noneLabel="Tous les stades"
                    />
                </div>

                {/* Main Stats Dashboard */}
                {advancedStats && (
                    <>
                        <div className={styles.statsGrid}>
                            <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                                <p className={styles.statValue}>{advancedStats.wins}</p>
                                <p className={styles.statLabel}>Victoires</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue} style={{ color: 'var(--color-accent-orange)' }}>
                                    {advancedStats.losses}
                                </p>
                                <p className={styles.statLabel}>Défaites</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue}>{advancedStats.totalGames}</p>
                                <p className={styles.statLabel}>Parties</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue}>
                                    {Math.round(advancedStats.winRate)}%
                                </p>
                                <p className={styles.statLabel}>Winrate</p>
                            </div>
                        </div>

                        {/* Elo History Chart */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Évolution de l&apos;Elo
                            </h3>
                            <div className={styles.chartCard}>
                                <EloChart data={advancedStats.eloHistory} />
                            </div>
                        </div>


                        {/* Gamelles Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <FireIcon className="w-5 h-5" />
                                Gamelles
                            </h3>
                            <div className={styles.gamellesGrid}>
                                <div className={styles.gamelleCard}>
                                    <p className={styles.gamelleValue}>{advancedStats.gamelleStats.total}</p>
                                    <p className={styles.gamelleLabel}>Total</p>
                                    <p className={styles.gamelleSub}>{Math.round(advancedStats.gamelleStats.totalPercentage)}% des matchs</p>
                                </div>
                                <div className={styles.gamelleCard}>
                                    <p className={styles.gamelleValue}>{advancedStats.gamelleStats.rentrantes}</p>
                                    <p className={styles.gamelleLabel}>Rentrantes</p>
                                    <p className={styles.gamelleSub}>{Math.round(advancedStats.gamelleStats.rentrantesPercentage)}% des matchs</p>
                                </div>
                            </div>
                        </div>

                        {/* Flash Goals Section */}
                        {advancedStats.flashStats.total > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <FireIcon className="w-5 h-5" />
                                    Buts Flash
                                </h3>
                                <div className={styles.gamellesGrid}>
                                    <div className={styles.gamelleCard}>
                                        <p className={styles.gamelleValue}>{advancedStats.flashStats.total}</p>
                                        <p className={styles.gamelleLabel}>Total</p>
                                        <p className={styles.gamelleSub}>{Math.round(advancedStats.flashStats.totalPercentage)}% des matchs</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Roles Section (Only if 2v2 is possible) */}
                        {modeFilter !== '1v1' && (advancedStats.roleStats.attack.games > 0 || advancedStats.roleStats.defense.games > 0) && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <TrophyIcon className="w-5 h-5" />
                                    Performance par Rôle (2v2)
                                </h3>
                                <div className={styles.rolesGrid}>
                                    <div className={styles.roleCard}>
                                        <p className={styles.roleTitle}>Attaque</p>
                                        <p className={styles.roleValue}>{Math.round(advancedStats.roleStats.attack.winRate * 100)}%</p>
                                        <p className={styles.roleSub}>{advancedStats.roleStats.attack.games} matchs</p>
                                    </div>
                                    <div className={styles.roleCard}>
                                        <p className={styles.roleTitle}>Défense</p>
                                        <p className={styles.roleValue}>{Math.round(advancedStats.roleStats.defense.winRate * 100)}%</p>
                                        <p className={styles.roleSub}>{advancedStats.roleStats.defense.games} matchs</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detailed Metrics */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Métriques Détaillées
                            </h3>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Buts / Match</span>
                                    <span className={styles.detailValue}>{advancedStats.goalsPerGame.overall.toFixed(1)}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Clean Sheets</span>
                                    <span className={styles.detailValue}>{advancedStats.cleanSheets}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Remontadas</span>
                                    <span className={styles.detailValue}>{advancedStats.comebacks}</span>
                                    <button onClick={() => setShowRemontadaInfo(true)} className={styles.infoBtn}>
                                        <InformationCircleIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Meilleure Série</span>
                                    <span className={styles.detailValue}>{advancedStats.winStreak} V</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Teammates Podium */}
                        {modeFilter !== '1v1' && topTeammates.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <UserPlusIcon className="w-5 h-5" />
                                    Duo de Choc (2v2)
                                </h3>
                                <div className={styles.podiumCard}>
                                    <div className={styles.podium}>
                                        {/* 2nd place - left */}
                                        {topTeammates[1] ? (
                                            <div className={`${styles.podiumSpot} cursor-pointer`} onClick={() => router.push(`/profile/${topTeammates[1].userId}`)}>
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
                                        <div className={`${styles.podiumSpot} cursor-pointer`} onClick={() => router.push(`/profile/${topTeammates[0].userId}`)}>
                                            <RankAvatar size="lg" elo={teammateElos.get(topTeammates[0].userId)} />
                                            <span className={styles.podiumName}>{topTeammates[0].username}</span>
                                            <span className={styles.podiumWins}>{topTeammates[0].wins}V</span>
                                            <span className={styles.podiumGames}>{topTeammates[0].games} matchs</span>
                                            <div className={`${styles.podiumBar} ${styles.podiumBar1}`}>1</div>
                                        </div>

                                        {/* 3rd place - right */}
                                        {topTeammates[2] ? (
                                            <div className={`${styles.podiumSpot} cursor-pointer`} onClick={() => router.push(`/profile/${topTeammates[2].userId}`)}>
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
                                    <UsersIcon className="w-5 h-5" />
                                    Face à Face
                                </h3>
                                <div className={styles.h2hSearch}>
                                    <MagnifyingGlassIcon className={styles.h2hSearchIcon} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher un adversaire..."
                                        value={h2hSearchQuery}
                                        onChange={(e) => setH2hSearchQuery(e.target.value)}
                                        className={styles.h2hSearchInput}
                                    />
                                </div>
                                <div className={styles.h2hList}>
                                    {filteredH2H.map((h2h) => (
                                        <div key={h2h.opponentId} className={`${styles.h2hCard} cursor-pointer`} onClick={() => router.push(`/profile/${h2h.opponentId}`)}>
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
                )}

                {/* Dernières parties */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        <ClockIcon className="w-5 h-5" />
                        Dernières Parties
                    </h3>
                    {recentGames.length === 0 ? (
                        <div className={styles.emptyState}>Aucune partie trouvée avec ces filtres</div>
                    ) : (
                        <div className={styles.gamesList}>
                            {recentGames.map((game) => {
                                const result = getGameResult(game);
                                const isWin = result === 'Victoire';
                                const teammate = getTeammateName(game);
                                const eloChange = getEloChange(game);
                                return (
                                    <div key={game.gameId} className={styles.gameCard}>
                                        <div className={styles.gameInfo}>
                                            <span className={`${styles.gameResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>{result}</span>
                                            <span className={styles.gameOpponent}>vs {getOpponentNames(game)}</span>
                                            {teammate && (
                                                <span className={styles.gameTeammate}>avec {teammate}</span>
                                            )}
                                            <span className={styles.gameDate}>{formatDate(game.startedAt)}</span>
                                        </div>
                                        <div className={styles.gameRight}>
                                            <div className={styles.gameScore}>
                                                {(() => {
                                                    const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === profileUser.userId));
                                                    if (userTeamIndex === -1) return `${game.score[0]} - ${game.score[1]}`;
                                                    const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
                                                    return `${game.score[userTeamIndex]} - ${game.score[opponentTeamIndex]}`;
                                                })()}
                                            </div>
                                            {eloChange !== null && (
                                                <span className={`${styles.gameElo} ${eloChange >= 0 ? styles.eloPositive : styles.eloNegative}`}>
                                                    {eloChange >= 0 ? '+' : ''}{eloChange}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showRemontadaInfo && (
                <div className={styles.modalOverlay} onClick={() => setShowRemontadaInfo(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Remontadas</h3>
                        <p className={styles.modalText}>Victoire épique après avoir eu au moins 4 buts de retard à n&apos;importe quel moment du match.</p>
                        <button onClick={() => setShowRemontadaInfo(false)} className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content">Compris !</div>
                        </button>
                    </div>
                </div>
            )}


            {showUpdateModal && (
                <div className={styles.modalOverlay} onClick={() => !isUpdating && setShowUpdateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Pseudo</h3>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                disabled={isUpdating}
                                className={styles.modalCloseBtn}
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUsername}>
                            {updateError && <div className="error-box mb-4">{updateError}</div>}
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="input-field"
                                style={{ marginBottom: '1.25rem' }}
                                autoFocus
                                disabled={isUpdating}
                                required
                            />
                            <button type="submit" disabled={isUpdating || !newUsername.trim() || newUsername.trim() === profileUser.username} className="w-full">
                                <div className="btn-primary">
                                    <div className="btn-primary-shadow" />
                                    <div className="btn-primary-content">{isUpdating ? 'Mise à jour...' : 'Enregistrer'}</div>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
