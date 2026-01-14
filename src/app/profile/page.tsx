'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { registerComplete, checkUsernameAvailable, updateUsername } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserGames } from '@/lib/firebase/games';
import { getFriendRequestCount } from '@/lib/firebase/friends';
import { Game, Venue } from '@/types';
import BottomNav from '@/components/common/BottomNav';
import VenueDropdown from '@/components/venues/VenueDropdown';
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
    UserPlusIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize, logout } = useAuthStore();
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState(true);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);

    // Filters state
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [pointsFilter, setPointsFilter] = useState<'6' | '11' | 'all'>('all');
    const [modeFilter, setModeFilter] = useState<'1v1' | '2v2' | 'all'>('all');

    // Head-to-head search state
    const [h2hSearchQuery, setH2hSearchQuery] = useState('');

    // Info modal state
    const [showRemontadaInfo, setShowRemontadaInfo] = useState(false);
    const [showMatchPointInfo, setShowMatchPointInfo] = useState(false);

    // Username update state
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    // Friend requests count
    const [friendRequestsCount, setFriendRequestsCount] = useState(0);

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

    useEffect(() => {
        if (user) {
            loadGames();
            loadFriendRequestsCount();
        }
    }, [user]);

    const loadFriendRequestsCount = async () => {
        if (!user) return;
        try {
            const count = await getFriendRequestCount(user.userId);
            setFriendRequestsCount(count);
        } catch (error) {
            console.error('Error loading friend requests count:', error);
        }
    };

    // Recalculate stats when filters change
    useEffect(() => {
        if (user && allGames.length > 0) {
            const stats = calculateAdvancedStats(allGames, user.userId, {
                venueId: selectedVenue?.venueId,
                points: pointsFilter,
                mode: modeFilter
            });
            setAdvancedStats(stats);

            // Update recent games based on filters
            const filtered = allGames.filter(g => {
                if (selectedVenue && g.venueId !== selectedVenue.venueId) return false;
                if (pointsFilter !== 'all' && g.gameType !== pointsFilter) return false;
                if (modeFilter !== 'all') {
                    const is2v2 = g.teams[0].players.length + g.teams[1].players.length === 4;
                    if (modeFilter === '1v1' && is2v2) return false;
                    if (modeFilter === '2v2' && !is2v2) return false;
                }
                return true;
            });
            setRecentGames(filtered.slice(0, 5));
        }
    }, [selectedVenue, pointsFilter, modeFilter, allGames, user]);

    const loadGames = async () => {
        if (!user) return;
        try {
            const games = await getUserGames(user.userId, 200);
            setAllGames(games);
        } catch (error) {
            console.error('Error loading games:', error);
        } finally {
            setIsLoadingGames(false);
        }
    };

    // Filter head-to-head based on search
    const filteredH2H = useMemo(() => {
        if (!advancedStats) return [];
        const list = h2hSearchQuery.trim()
            ? advancedStats.headToHead.filter(h2h => h2h.opponentName.toLowerCase().includes(h2hSearchQuery.toLowerCase()))
            : advancedStats.headToHead;
        return list.slice(0, 5);
    }, [advancedStats, h2hSearchQuery]);

    if (authLoading) {
        return (
            <div className="container-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const formatDate = (date: Date | any) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date.seconds * 1000);
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    };

    const getGameResult = (game: Game) => {
        if (game.winner === undefined) return 'Nul';
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === user.userId));
        if (userTeamIndex === -1) return '?';
        return game.winner === userTeamIndex ? 'Victoire' : 'Défaite';
    };

    const getOpponentNames = (game: Game) => {
        const userTeamIndex = game.teams.findIndex(t => t.players.some(p => p.userId === user.userId));
        if (userTeamIndex === -1) return '';
        const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
        return game.teams[opponentTeamIndex].players.map(p => p.username).join(' & ');
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const handleUpdateUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newUsername.trim() || newUsername.trim() === user.username) {
            setShowUpdateModal(false);
            return;
        }
        setIsUpdating(true);
        setUpdateError('');
        try {
            const isAvailable = await checkUsernameAvailable(newUsername.trim(), user.userId);
            if (!isAvailable) {
                setUpdateError('Ce pseudo est déjà pris');
                setIsUpdating(false);
                return;
            }
            await updateUsername(user.userId, newUsername.trim());
            setShowUpdateModal(false);
        } catch (error) {
            console.error('Error updating username:', error);
            setUpdateError('Erreur lors de la mise à jour');
        } finally {
            setIsUpdating(false);
        }
    };

    const openUpdateModal = () => {
        setNewUsername(user.username);
        setUpdateError('');
        setShowUpdateModal(true);
    };

    // WinRate Chart Component
    const WinRateChart = ({ data }: { data: Array<{ date: string, winRate: number }> }) => {
        if (data.length < 2) return <div className={styles.chartEmpty}>Pas assez de données pour le graphique</div>;

        const width = 300;
        const height = 100;
        const padding = 10;

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
            const y = height - ((d.winRate / 100) * (height - 2 * padding) + padding);
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className={styles.chartContainer}>
                <svg viewBox={`0 0 ${width} ${height}`} className={styles.svgChart}>
                    {/* Grid lines */}
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(51,51,51,0.1)" strokeDasharray="4" />
                    {/* The line */}
                    <polyline
                        fill="none"
                        stroke="var(--color-green-medium)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points}
                    />
                    {/* Dots */}
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
                        const y = height - ((d.winRate / 100) * (height - 2 * padding) + padding);
                        return <circle key={i} cx={x} cy={y} r="3" fill="#333" />;
                    })}
                </svg>
                <div className={styles.chartLabels}>
                    <span>{data[0].date}</span>
                    <span>Progression Winrate (%)</span>
                    <span>{data[data.length - 1].date}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Tableau de Bord</h1>
                    <div className={styles.headerActions}>
                        <button onClick={() => router.push('/friends')} className={styles.friendRequestsBtn}>
                            <UserPlusIcon className={styles.logoutIcon} />
                            {friendRequestsCount > 0 && (
                                <span className={styles.friendRequestsBadge}>{friendRequestsCount}</span>
                            )}
                        </button>
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            <ArrowRightOnRectangleIcon className={styles.logoutIcon} />
                        </button>
                    </div>
                </div>

                <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.usernameContainer}>
                            <h2 className={styles.username}>{user.username}</h2>
                            <button onClick={openUpdateModal} className={styles.editBtn}>
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <p className={styles.joinDate}>
                            Membre depuis {formatDate(user.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className={styles.filterSection}>
                    <div className={styles.filterRow}>
                        <div className={styles.segmentedControl}>
                            <button
                                className={`${styles.segment} ${pointsFilter === 'all' ? styles.segmentActive : ''}`}
                                onClick={() => setPointsFilter('all')}
                            >Tous</button>
                            <button
                                className={`${styles.segment} ${pointsFilter === '6' ? styles.segmentActive : ''}`}
                                onClick={() => setPointsFilter('6')}
                            >6 pts</button>
                            <button
                                className={`${styles.segment} ${pointsFilter === '11' ? styles.segmentActive : ''}`}
                                onClick={() => setPointsFilter('11')}
                            >11 pts</button>
                        </div>
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
                {advancedStats && !isLoadingGames && (
                    <>
                        <div className={styles.statsGrid}>
                            <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                                <p className={styles.statValue}>{advancedStats.formatStats['6'].wins + advancedStats.formatStats['11'].wins}</p>
                                <p className={styles.statLabel}>Victoires</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue} style={{ color: 'var(--color-accent-orange)' }}>
                                    {(advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games) - (advancedStats.formatStats['6'].wins + advancedStats.formatStats['11'].wins)}
                                </p>
                                <p className={styles.statLabel}>Défaites</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue}>{advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games}</p>
                                <p className={styles.statLabel}>Parties</p>
                            </div>
                            <div className={styles.statCard}>
                                <p className={styles.statValue}>
                                    {(() => {
                                        const total = advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games;
                                        const wins = advancedStats.formatStats['6'].wins + advancedStats.formatStats['11'].wins;
                                        return total > 0 ? `${Math.round((wins / total) * 100)}%` : '0%';
                                    })()}
                                </p>
                                <p className={styles.statLabel}>Winrate</p>
                            </div>
                        </div>

                        {/* Winrate History Chart */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Évolution du Winrate
                            </h3>
                            <div className={styles.chartCard}>
                                <WinRateChart data={advancedStats.winRateHistory} />
                            </div>
                        </div>

                        {/* Match Points Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <FireIcon className="w-5 h-5" />
                                Balles de Match
                                <button onClick={() => setShowMatchPointInfo(true)} className={styles.infoBtn}>
                                    <InformationCircleIcon className="w-4 h-4" />
                                </button>
                            </h3>
                            <div className={styles.matchPointsGrid}>
                                <div className={styles.matchPointCard}>
                                    <p className={styles.matchPointValue} style={{ color: '#4CAF50' }}>{advancedStats.matchPoints.saved}</p>
                                    <p className={styles.matchPointLabel}>Sauvées</p>
                                </div>
                                <div className={styles.matchPointCard}>
                                    <p className={styles.matchPointValue} style={{ color: '#FF9800' }}>{advancedStats.matchPoints.missed}</p>
                                    <p className={styles.matchPointLabel}>Ratées</p>
                                </div>
                            </div>
                        </div>

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
                                    <span className={styles.detailLabel}>
                                        Remontadas
                                        <button onClick={() => setShowRemontadaInfo(true)} className={styles.infoBtn}>
                                            <InformationCircleIcon className="w-4 h-4" />
                                        </button>
                                    </span>
                                    <span className={styles.detailValue}>{advancedStats.comebacks}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Meilleure Série</span>
                                    <span className={styles.detailValue}>{advancedStats.winStreak} V</span>
                                </div>
                            </div>
                        </div>

                        {/* Head-to-Head */}
                        {advancedStats.headToHead.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <UserPlusIcon className="w-5 h-5" />
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
                                        <div key={h2h.opponentId} className={styles.h2hCard}>
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
                    {isLoadingGames ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : recentGames.length === 0 ? (
                        <div className={styles.emptyState}>Aucune partie trouvée avec ces filtres</div>
                    ) : (
                        <div className={styles.gamesList}>
                            {recentGames.map((game) => {
                                const result = getGameResult(game);
                                const isWin = result === 'Victoire';
                                return (
                                    <div key={game.gameId} className={styles.gameCard}>
                                        <div className={styles.gameInfo}>
                                            <span className={`${styles.gameResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>{result}</span>
                                            <span className={styles.gameOpponent}>vs {getOpponentNames(game)}</span>
                                            <span className={styles.gameDate}>{formatDate(game.startedAt)}</span>
                                        </div>
                                        <div className={styles.gameScore}>{game.score[0]} - {game.score[1]}</div>
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
                        <p className={styles.modalText}>Victoire épique après avoir été largement mené en fin de partie.</p>
                        <p className={styles.modalSubText}>
                            • En 6 pts: Mené de 3+ buts quand l'adversaire a 4 ou 5.<br />
                            • En 11 pts: Mené de 5+ buts quand l'adversaire a 8, 9 ou 10.
                        </p>
                        <button onClick={() => setShowRemontadaInfo(false)} className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content">Compris !</div>
                        </button>
                    </div>
                </div>
            )}

            {showMatchPointInfo && (
                <div className={styles.modalOverlay} onClick={() => setShowMatchPointInfo(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Balles de Match</h3>
                        <p className={styles.modalText}>
                            <strong>Sauvées :</strong> L'adversaire était à 1 point de gagner, mais vous avez marqué ce point.
                        </p>
                        <p className={styles.modalText}>
                            <strong>Ratées :</strong> Vous étiez à 1 point de gagner, mais l'adversaire a marqué ce point.
                        </p>
                        <button onClick={() => setShowMatchPointInfo(false)} className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content">Compris !</div>
                        </button>
                    </div>
                </div>
            )}

            {showUpdateModal && (
                <div className={styles.modalOverlay} onClick={() => !isUpdating && setShowUpdateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={styles.modalTitle}>Pseudo</h3>
                            <button onClick={() => setShowUpdateModal(false)} disabled={isUpdating}><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleUpdateUsername}>
                            {updateError && <div className="error-box mb-4">{updateError}</div>}
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="input-field mb-4"
                                autoFocus
                                disabled={isUpdating}
                                required
                            />
                            <button type="submit" disabled={isUpdating || !newUsername.trim() || newUsername.trim() === user.username} className="w-full">
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
