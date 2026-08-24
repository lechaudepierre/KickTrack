'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useFeature } from '@/lib/features';
import { getUserById, checkUsernameAvailable, updateUsername } from '@/lib/firebase/auth';
import { getUserGames, getPlayerRank } from '@/lib/firebase/games';
import { getFriendRequestCount } from '@/lib/firebase/friends';
import { getAnnouncements, countUnread } from '@/lib/firebase/announcements';
import { Game, Venue, User, Announcement } from '@/types';
import VenueDropdown from '@/components/venues/VenueDropdown';
import BottomNav from '@/components/common/BottomNav';
import PlayerTitle from '@/components/common/PlayerTitle';
import { calculateAdvancedStats, getPositionLabel, AdvancedStats, BadgeId } from '@/lib/utils/statsCalculator';
import { BADGE_CONFIG } from '@/lib/utils/badgeConfig';
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
    PlusIcon,
    BoltIcon,
    ShieldCheckIcon,
    StarIcon,
    XCircleIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const BADGE_ICONS: Record<BadgeId, React.ComponentType<{ className?: string }>> = {
    eclair: BoltIcon,
    muraille: ShieldCheckIcon,
    buteur: StarIcon,
    gamelleur: XCircleIcon,
    patron: TrophyIcon,
    en_feu: FireIcon,
    mvp: SparklesIcon,
};
import styles from './ProfileContent.module.css';
import RankAvatar from '@/components/common/RankAvatar';
import PlayerBanner from '@/components/common/PlayerBanner';
import { getRankInfo } from '@/lib/utils/rankUtils';
import { readLadder, LADDERS } from '@/lib/game/ladders';
import { toDate } from '@/lib/game/dates';
import { resolvePeakElo } from '@/lib/game/scoring';
import { RankProgressBar, Button } from '@/components/common/ui';
import SeasonHistory from './SeasonHistory';
import ProfileTabs, { type ProfileTab } from './ProfileTabs';
import ProfileHistoryTab from './ProfileHistoryTab';
import ProfilePlayersTab from './ProfilePlayersTab';
import ProfileStatsTab from './ProfileStatsTab';

interface ProfileContentProps {
    targetUserId: string;
    isMe?: boolean;
}

export default function ProfileContent({ targetUserId, isMe = false }: ProfileContentProps) {
    const router = useRouter();
    const v2Enabled = useFeature('v2');
    const { user: currentUser, logout } = useAuthStore();

    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    // Place au classement général. `null` = pas encore chargée, ou incalculable.
    const [rank, setRank] = useState<number | null>(null);
    // Classement Blitz — chantier 7.11. Sa propre carte, comme demandé.
    const [blitzRank, setBlitzRank] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
    const [selectedBadge, setSelectedBadge] = useState<BadgeId | null>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>('stats');

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

            // Un simple comptage côté serveur : la place revient en un entier,
            // sans télécharger le classement. Jamais bloquant pour l'affichage.
            if (userData?.stats?.elo) {
                getPlayerRank(userData.stats.elo)
                    .then(setRank)
                    .catch(() => setRank(null));
            }

            // Une seule requête de plus, et seulement si le joueur a
            // réellement joué en Blitz. Sinon la carte n'existe pas.
            const blitz = readLadder(userData?.stats, 'blitz');
            if (blitz.games > 0) {
                getPlayerRank(blitz.elo, 'blitz')
                    .then(setBlitzRank)
                    .catch(() => setBlitzRank(null));
            }

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
                <div className="spinner-ring" style={{ width: '64px', height: '64px', borderWidth: '4px', borderTopColor: 'transparent', borderRadius: 'var(--radius-full)' }} />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <p className={styles.emptyState}>Joueur non trouvé</p>
                    <Button onClick={() => router.back()} style={{ marginTop: 'var(--spacing-md)' }}>Retour</Button>
                </div>
            </div>
        );
    }

    // `startedAt` arrive soit en Date, soit en Timestamp Firestore ({ seconds }).
    const formatDate = (date: Date | { seconds: number } | null | undefined) => {
        if (!date) return '';
        const d = toDate(date);
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

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {!isMe && (
                            <button onClick={() => router.back()} className={styles.backButton}>
                                <ArrowLeftIcon width={20} height={20} />
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
                                    <button onClick={handleAddFriend}
                                        className={styles.addFriendBtn}
                                        disabled={isActionPending}
                                    >
                                        <UserPlusIcon style={{ width: '20px', height: '20px', marginRight: 'var(--spacing-sm)' }} />
                                        <span>Ajouter</span>
                                    </button>
                                )}
                                {relationshipStatus === 'pending' && (
                                    <button className={styles.pendingBtn} disabled>
                                        <ClockIcon style={{ width: '20px', height: '20px', marginRight: 'var(--spacing-sm)' }} />
                                        <span>En attente</span>
                                    </button>
                                )}
                                {relationshipStatus === 'friend' && (
                                    <div className={styles.friendBadge}>
                                        <CheckIcon style={{ width: '20px', height: '20px', marginRight: 'var(--spacing-sm)' }} />
                                        <span>Ami</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <PlayerBanner
                    bannerId={profileUser.bannerId}
                    equipped={v2Enabled ? profileUser.equipped : null}
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
                                    <PencilIcon width={16} height={16} />
                                </button>
                            )}
                        </div>
                        {/* Le titre équipé, juste sous le pseudo. Avant ça, on
                            pouvait équiper un titre sans qu'il s'affiche nulle
                            part. */}
                        <PlayerTitle equipped={v2Enabled ? profileUser.equipped : null} />
                        <p className={styles.eloRankLine}>
                            {profileUser.stats.elo || 1000} Elo
                            {' – '}
                            {(() => { const r = getRankInfo(profileUser.stats.elo); return `${r.label} ${r.romanLevel}`; })()}
                            {/* La place n'apparaît que lorsqu'elle est connue :
                                mieux vaut ne rien montrer qu'un rang faux. */}
                            {rank !== null && (
                                <>
                                    {' – '}
                                    <span className={styles.rankPosition}>#{rank}</span>
                                </>
                            )}
                        </p>
                        {/* Pic d'ELO. Reconstitué depuis `eloHistory` quand `peakElo` n'a
                            jamais été suivi — ce qui est le cas des 147 comptes antérieurs
                            au 20/08. Masqué quand il égale l'ELO courant : afficher
                            « Record : 1000 » à quelqu'un qui est à 1000 n'apprend rien. */}
                        {(() => {
                            const peak = resolvePeakElo(profileUser.stats);
                            if (peak <= (profileUser.stats.elo ?? 1000)) return null;
                            const r = getRankInfo(peak);
                            return (
                                <p className={styles.peakEloLine}>
                                    Record : {peak} Elo – {r.label} {r.romanLevel}
                                </p>
                            );
                        })()}
                    </div>
                </PlayerBanner>

                {/* Progression vers le grade suivant.
                    Placée SOUS la bannière et non dedans : la bannière est une
                    image de fond arbitraire, une barre par-dessus serait
                    illisible sur la moitié des visuels. */}
                <RankProgressBar elo={profileUser.stats.elo} />

                {/* Saisons passées — chantier 3.5.
                    Placé juste sous la progression courante : les deux
                    répondent à la même question, « où j'en suis », l'une
                    maintenant et l'autre avant. Ne rend rien tant qu'aucune
                    saison n'est close. */}
                <SeasonHistory userId={targetUserId} />

                {/* Carte du classement Blitz — chantier 7.11.
                    Une carte À PART ENTIÈRE, pas une ligne de plus sur la carte
                    principale : c'est une autre échelle, pas une autre
                    statistique de la même. Elle n'apparaît que si le joueur y a
                    joué (décision de Sacha, 22/08). */}
                {(() => {
                    const blitz = readLadder(profileUser.stats, 'blitz');
                    if (blitz.games === 0) return null;
                    const r = getRankInfo(blitz.elo);
                    return (
                        <div className={styles.ladderCard}>
                            <div className={styles.ladderCardHeader}>
                                <span className={styles.ladderCardTitle}>{LADDERS.blitz.label}</span>
                                <span className={styles.ladderCardGames}>
                                    {blitz.games} partie{blitz.games > 1 ? 's' : ''}
                                </span>
                            </div>
                            <p className={styles.ladderCardLine}>
                                {blitz.elo} Elo – {r.label} {r.romanLevel}
                                {blitzRank !== null && (
                                    <>
                                        {' – '}
                                        <span className={styles.rankPosition}>#{blitzRank}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    );
                })()}

                {/* Badges */}
                {advancedStats && advancedStats.badges.length > 0 && (
                    <div className={styles.badgesRow}>
                        {advancedStats.badges.map(badgeId => {
                            const badge = BADGE_CONFIG[badgeId];
                            const Icon = BADGE_ICONS[badgeId];
                            return (
                                <button key={badgeId}
                                    className={styles.badgePill}
                                    onClick={() => setSelectedBadge(badgeId)}
                                >
                                    <Icon className={styles.badgePillIcon} />
                                    {badge.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Voir la collection d'un autre joueur — chantier 4.9.
                    SOUS les pastilles de badge, pas au-dessus (Sacha, 21/08) :
                    les badges décrivent le joueur, le bouton emmène ailleurs.
                    Un bouton coincé entre deux blocs descriptifs se lit comme
                    une étiquette de plus. */}
                {!isMe && v2Enabled && (
                    <button type="button"
                        className={`${styles.collectionLink} ${styles.collectionLinkOther}`}
                        onClick={() => router.push(`/collection?joueur=${targetUserId}`)}
                    >
                        Voir sa collection →
                    </button>
                )}

                {/*
                    Ici s'affichait « CREATOR » pour trois pseudos écrits en dur.
                    Deux défauts : le terme (c'est « Fondateur » depuis le 22/08)
                    et surtout le principe — l'identité tenait à une chaîne que
                    le joueur pouvait changer lui-même.

                    C'est exactement ce que le socle collection remplace : les
                    fondateurs possèdent le titre « Fondateur » et la bannière
                    « creator », affichés par `PlayerTitle` et la bannière du
                    profil, juste au-dessus. La date d'inscription redevient
                    donc ce qu'elle est pour tout le monde.
                */}
                <p className={styles.joinDate}>
                    Membre depuis {formatDate(profileUser.createdAt)}
                </p>

                {/* Filters Section */}
                <div className={styles.filterSection}>
                    <div className={styles.filterRow}>
                        <div className={styles.segmentedControl}>
                            <button className={`${styles.segment} ${modeFilter === 'all' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('all')}
                            >Tous</button>
                            <button className={`${styles.segment} ${modeFilter === '1v1' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('1v1')}
                            >1v1</button>
                            <button className={`${styles.segment} ${modeFilter === '2v2' ? styles.segmentActive : ''}`}
                                onClick={() => setModeFilter('2v2')}
                            >2v2</button>
                        </div>
                    </div>
                    <VenueDropdown selectedVenue={selectedVenue}
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
                                <p className={styles.statValue} style={{ color: 'var(--color-warning)' }}>
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
                                <p className={styles.statLabel}>Ratio</p>
                            </div>
                        </div>


                        {/* Onglets — refonte du profil. Les onze sections empilées
                            sont regroupées en trois vues. Aucune donnée retirée. */}
                        <ProfileTabs active={activeTab} onChange={setActiveTab} />

                        {activeTab === 'stats' && (
                            <ProfileStatsTab advancedStats={advancedStats}
                                modeFilter={modeFilter}
                                onShowRemontadaInfo={() => setShowRemontadaInfo(true)}
                            />
                        )}

                        {activeTab === 'joueurs' && (
                            <ProfilePlayersTab advancedStats={advancedStats}
                                topTeammates={topTeammates}
                                teammateElos={teammateElos}
                                modeFilter={modeFilter}
                                searchQuery={h2hSearchQuery}
                                onSearchChange={setH2hSearchQuery}
                            />
                        )}

                        {activeTab === 'historique' && (
                            <ProfileHistoryTab games={recentGames} userId={profileUser.userId} />
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showRemontadaInfo && (
                <div className={styles.modalOverlay} onClick={() => setShowRemontadaInfo(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Remontadas</h3>
                        <p className={styles.modalText}>Victoire épique après avoir eu au moins 4 buts de retard à n&apos;importe quel moment du match.</p>
                        <Button onClick={() => setShowRemontadaInfo(false)} fullWidth>Compris !</Button>
                    </div>
                </div>
            )}


            {showUpdateModal && (
                <div className={styles.modalOverlay} onClick={() => !isUpdating && setShowUpdateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Pseudo</h3>
                            <button onClick={() => setShowUpdateModal(false)}
                                disabled={isUpdating}
                                className={styles.modalCloseBtn}
                            >
                                <XMarkIcon width={24} height={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUsername}>
                            {updateError && <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>{updateError}</div>}
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
                            <Button type="submit" disabled={isUpdating || !newUsername.trim() || newUsername.trim() === profileUser.username} fullWidth>
{isUpdating ? 'Mise à jour...' : 'Enregistrer'}
</Button>
                        </form>

                        {/* La personnalisation vit sur /collection, pas ici.
                            Deux interfaces pour équiper le même item, ce serait
                            deux comportements à maintenir en accord.
                            Masqué tant que la fonctionnalité n'est pas livrée
                            pour ce joueur (drapeau `collectionV2`). */}
                        {v2Enabled && (
                            <button type="button"
                                className={styles.collectionLink}
                                onClick={() => router.push('/collection')}
                            >
                                Personnaliser mon profil →
                            </button>
                        )}
                    </div>
                </div>
            )}

            <BottomNav />

            {/* Badge detail modal */}
            {selectedBadge && (() => {
                const badge = BADGE_CONFIG[selectedBadge];
                const Icon = BADGE_ICONS[selectedBadge];
                return (
                    <div className={styles.badgeModalOverlay} onClick={() => setSelectedBadge(null)}>
                        <div className={styles.badgeModal} onClick={e => e.stopPropagation()}>
                            <button className={styles.badgeModalClose} onClick={() => setSelectedBadge(null)}>
                                <XMarkIcon width={20} height={20} />
                            </button>
                            <Icon className={styles.badgeModalIcon} />
                            <h3 className={styles.badgeModalTitle}>{badge.label}</h3>
                            <p className={styles.badgeModalRule}>{badge.rule}</p>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
