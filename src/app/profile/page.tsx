'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getUserGames } from '@/lib/firebase/games';
import { getVenues } from '@/lib/firebase/firestore';
import { Game, Venue } from '@/types';
import BottomNav from '@/components/common/BottomNav';
import { calculateAdvancedStats, getPositionLabel, AdvancedStats } from '@/lib/utils/statsCalculator';
import {
    ClockIcon,
    MapPinIcon,
    FireIcon,
    TrophyIcon,
    ChartBarIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    ArrowRightOnRectangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize, logout } = useAuthStore();
    const [recentGames, setRecentGames] = useState<Game[]>([]);
    const [allGames, setAllGames] = useState<Game[]>([]);
    const [isLoadingGames, setIsLoadingGames] = useState(true);
    const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);

    // Venue filter state
    const [venues, setVenues] = useState<Venue[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<string>('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Head-to-head search state
    const [h2hSearchQuery, setH2hSearchQuery] = useState('');

    // Info modal state
    const [showRemontadaInfo, setShowRemontadaInfo] = useState(false);

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
            loadVenues();
        }
    }, [user]);

    // Recalculate stats when venue filter changes
    useEffect(() => {
        if (user && allGames.length > 0) {
            const filteredGames = selectedVenue === 'all'
                ? allGames
                : allGames.filter(g => g.venueId === selectedVenue);

            const stats = calculateAdvancedStats(filteredGames, user.userId);
            setAdvancedStats(stats);

            // Also update recent games based on filter
            setRecentGames(filteredGames.slice(0, 5));
        }
    }, [selectedVenue, allGames, user]);

    const loadVenues = async () => {
        try {
            const data = await getVenues();
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const loadGames = async () => {
        if (!user) return;
        try {
            const games = await getUserGames(user.userId, 100);
            setAllGames(games);
            setRecentGames(games.slice(0, 5));

            const stats = calculateAdvancedStats(games, user.userId);
            setAdvancedStats(stats);
        } catch (error) {
            console.error('Error loading games:', error);
        } finally {
            setIsLoadingGames(false);
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

    // Filter head-to-head based on search
    const filteredH2H = useMemo(() => {
        if (!advancedStats) return [];
        if (!h2hSearchQuery.trim()) return advancedStats.headToHead.slice(0, 5);

        const query = h2hSearchQuery.toLowerCase();
        return advancedStats.headToHead.filter(h2h =>
            h2h.opponentName.toLowerCase().includes(query)
        );
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
        const opponents = game.teams[opponentTeamIndex].players;

        return opponents.map(p => p.username).join(' & ');
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Mes Stats</h1>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <ArrowRightOnRectangleIcon className={styles.logoutIcon} />
                    </button>
                </div>

                <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                        <h2 className={styles.username}>{user.username}</h2>
                        <p className={styles.joinDate}>
                            Membre depuis {formatDate(user.createdAt)}
                        </p>
                    </div>
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

                {/* Stats principales */}
                <div className={styles.statsGrid}>
                    <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
                        <p className={`${styles.statValue} ${styles.statValueHighlight}`}>
                            {advancedStats ? advancedStats.formatStats['6'].wins + advancedStats.formatStats['11'].wins : user.stats.wins}
                        </p>
                        <p className={styles.statLabel}>Victoires</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue} style={{ color: 'var(--color-accent-orange)' }}>
                            {advancedStats ? advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games - advancedStats.formatStats['6'].wins - advancedStats.formatStats['11'].wins : user.stats.losses}
                        </p>
                        <p className={styles.statLabel}>Défaites</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue}>
                            {advancedStats ? advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games : user.stats.totalGames}
                        </p>
                        <p className={styles.statLabel}>Parties</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statValue}>
                            {advancedStats ? (() => {
                                const totalGames = advancedStats.formatStats['6'].games + advancedStats.formatStats['11'].games;
                                const totalWins = advancedStats.formatStats['6'].wins + advancedStats.formatStats['11'].wins;
                                return totalGames > 0 ? `${Math.round((totalWins / totalGames) * 100)}%` : '0%';
                            })() : '0%'}
                        </p>
                        <p className={styles.statLabel}>Ratio</p>
                    </div>
                </div>

                {/* Stats avancées */}
                {advancedStats && !isLoadingGames && (
                    <>
                        {/* 1. Forme récente */}
                        {advancedStats.recentForm.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <FireIcon className="w-5 h-5" />
                                    Forme récente
                                </h3>
                                <div className={styles.formCard}>
                                    <div className={styles.formIndicators}>
                                        {advancedStats.recentForm.map((result, i) => (
                                            <div
                                                key={i}
                                                className={`${styles.formBadge} ${result === 'W' ? styles.formWin : result === 'L' ? styles.formLoss : styles.formDraw
                                                    }`}
                                            >
                                                {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
                                            </div>
                                        ))}
                                    </div>
                                    {advancedStats.currentStreak.count > 0 && (
                                        <p className={styles.streakText}>
                                            {advancedStats.currentStreak.type === 'win'
                                                ? `${advancedStats.currentStreak.count} victoire${advancedStats.currentStreak.count > 1 ? 's' : ''} d'affilée`
                                                : `${advancedStats.currentStreak.count} défaite${advancedStats.currentStreak.count > 1 ? 's' : ''} d'affilée`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 2. Head-to-Head */}
                        {advancedStats.headToHead.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <ChartBarIcon className="w-5 h-5" />
                                    Face à face
                                </h3>

                                {/* Search input */}
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
                                    {filteredH2H.length === 0 ? (
                                        <div className={styles.h2hEmpty}>
                                            Aucun adversaire trouvé
                                        </div>
                                    ) : (
                                        filteredH2H.map((h2h) => (
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
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Position préférée (Zone de tir favorite) */}
                        {advancedStats.favoritePosition && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <TrophyIcon className="w-5 h-5" />
                                    Zone de tir favorite
                                </h3>
                                <div className={styles.positionCard}>
                                    <div className={styles.positionHighlight}>
                                        <span className={styles.positionName}>
                                            {getPositionLabel(advancedStats.favoritePosition)}
                                        </span>
                                        <span className={styles.positionGoals}>
                                            {advancedStats.goalsByPosition[advancedStats.favoritePosition]} buts
                                        </span>
                                    </div>
                                    <div className={styles.positionBreakdown}>
                                        {Object.entries(advancedStats.goalsByPosition)
                                            .filter(([, count]) => count > 0)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([position, count]) => {
                                                const total = Object.values(advancedStats.goalsByPosition).reduce((a, b) => a + b, 0);
                                                const percentage = total > 0 ? (count / total) * 100 : 0;
                                                return (
                                                    <div key={position} className={styles.positionRow}>
                                                        <span className={styles.positionRowLabel}>
                                                            {getPositionLabel(position as any)}
                                                        </span>
                                                        <div className={styles.positionBar}>
                                                            <div
                                                                className={styles.positionBarFill}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className={styles.positionRowCount}>{count}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Stats détaillées */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Stats détaillées
                            </h3>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Meilleure série</span>
                                    <span className={styles.detailValue}>{advancedStats.winStreak} victoires</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Clean sheets</span>
                                    <span className={styles.detailValue}>{advancedStats.cleanSheets}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        Remontadas
                                        <button
                                            onClick={() => setShowRemontadaInfo(true)}
                                            style={{
                                                marginLeft: '0.25rem',
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                verticalAlign: 'middle'
                                            }}
                                        >
                                            <InformationCircleIcon className="w-4 h-4" style={{ color: 'rgba(51, 51, 51, 0.5)' }} />
                                        </button>
                                    </span>
                                    <span className={styles.detailValue}>{advancedStats.comebacks}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Durée moyenne</span>
                                    <span className={styles.detailValue}>{advancedStats.averageGameDuration.toFixed(0)} min</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Buts marqués</span>
                                    <span className={styles.detailValue}>{advancedStats.totalGoalsScored}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Buts encaissés</span>
                                    <span className={styles.detailValue}>{advancedStats.totalGoalsConceded}</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Moyenne de buts */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <ChartBarIcon className="w-5 h-5" />
                                Moyenne de buts
                            </h3>
                            <div className={styles.goalsGrid}>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.overall.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Par match</p>
                                </div>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.match6.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Match en 6</p>
                                </div>
                                <div className={styles.goalCard}>
                                    <p className={styles.goalValue}>
                                        {advancedStats.goalsPerGame.match11.toFixed(1)}
                                    </p>
                                    <p className={styles.goalLabel}>Match en 11</p>
                                </div>
                            </div>
                        </div>

                        {/* 6. Perfect Games */}
                        {(advancedStats.perfectGames.inflicted > 0 || advancedStats.perfectGames.conceded > 0) && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <TrophyIcon className="w-5 h-5" />
                                    Perfect Games
                                </h3>
                                <div className={styles.perfectGrid}>
                                    <div className={styles.perfectCard}>
                                        <p className={styles.perfectValue} style={{ color: '#4CAF50' }}>
                                            {advancedStats.perfectGames.inflicted}
                                        </p>
                                        <p className={styles.perfectLabel}>Infligés</p>
                                        <p className={styles.perfectDesc}>6-0 ou 11-0</p>
                                    </div>
                                    <div className={styles.perfectCard}>
                                        <p className={styles.perfectValue} style={{ color: '#FF9800' }}>
                                            {advancedStats.perfectGames.conceded}
                                        </p>
                                        <p className={styles.perfectLabel}>Concédés</p>
                                        <p className={styles.perfectDesc}>6-0 ou 11-0</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 7. Format préféré (Performance match) */}
                        {advancedStats.preferredFormat && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <ChartBarIcon className="w-5 h-5" />
                                    Par format de match
                                </h3>
                                <div className={styles.formatGrid}>
                                    <div className={`${styles.formatCard} ${advancedStats.preferredFormat === '6' ? styles.formatCardActive : ''}`}>
                                        <p className={styles.formatTitle}>Match en 6</p>
                                        <p className={styles.formatGames}>{advancedStats.formatStats['6'].games} parties</p>
                                        <p className={styles.formatWinRate}>
                                            {Math.round(advancedStats.formatStats['6'].winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                    <div className={`${styles.formatCard} ${advancedStats.preferredFormat === '11' ? styles.formatCardActive : ''}`}>
                                        <p className={styles.formatTitle}>Match en 11</p>
                                        <p className={styles.formatGames}>{advancedStats.formatStats['11'].games} parties</p>
                                        <p className={styles.formatWinRate}>
                                            {Math.round(advancedStats.formatStats['11'].winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 8. Lieu préféré (Lieux préférés) - Only show when "Tous les lieux" is selected */}
                        {selectedVenue === 'all' && advancedStats.favoriteVenue && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <MapPinIcon className="w-5 h-5" />
                                    Lieu préféré
                                </h3>
                                <div className={styles.venueCard}>
                                    <div className={styles.venueIcon}>
                                        <MapPinIcon className="w-6 h-6" />
                                    </div>
                                    <div className={styles.venueInfo}>
                                        <p className={styles.venueName}>{advancedStats.favoriteVenue.name}</p>
                                        <p className={styles.venueStats}>
                                            {advancedStats.favoriteVenue.gamesPlayed} parties • {Math.round(advancedStats.favoriteVenue.winRate * 100)}% de victoires
                                        </p>
                                    </div>
                                </div>
                                {advancedStats.venueStats.length > 1 && (
                                    <div className={styles.venueList}>
                                        {advancedStats.venueStats.slice(1, 4).map((venue, i) => (
                                            <div key={i} className={styles.venueListItem}>
                                                <span className={styles.venueListName}>{venue.name}</span>
                                                <span className={styles.venueListGames}>{venue.gamesPlayed} parties</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* 9. Dernières parties */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        <ClockIcon className="w-5 h-5" />
                        Dernières parties
                    </h3>

                    {isLoadingGames ? (
                        <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : recentGames.length === 0 ? (
                        <div className={styles.emptyState}>
                            Aucune partie jouée pour le moment
                        </div>
                    ) : (
                        <div className={styles.gamesList}>
                            {recentGames.map((game) => {
                                const result = getGameResult(game);
                                const isWin = result === 'Victoire';
                                const opponentNames = getOpponentNames(game);

                                return (
                                    <div key={game.gameId} className={styles.gameCard}>
                                        <div className={styles.gameInfo}>
                                            <span className={`${styles.gameResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>
                                                {result}
                                            </span>
                                            <span className={styles.gameOpponent}>
                                                vs {opponentNames}
                                            </span>
                                            <span className={styles.gameDate}>
                                                {formatDate(game.startedAt)}
                                            </span>
                                            <span className={styles.gameVenue}>
                                                {game.venueName}
                                            </span>
                                        </div>
                                        <div className={styles.gameScore}>
                                            {game.score[0]} - {game.score[1]}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Remontada Info Modal */}
            {showRemontadaInfo && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: 'var(--spacing-lg)'
                    }}
                    onClick={() => setShowRemontadaInfo(false)}
                >
                    <div
                        style={{
                            background: 'var(--color-beige)',
                            border: '4px solid #333',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-xl)',
                            maxWidth: '400px',
                            width: '100%',
                            boxShadow: '0 8px 0 #333'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-md)',
                            textTransform: 'uppercase'
                        }}>
                            Remontadas
                        </h3>
                        <p style={{
                            color: 'var(--color-text-dark)',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            marginBottom: 'var(--spacing-md)',
                            fontWeight: 600
                        }}>
                            Une <strong>remontada</strong> est une victoire où tu as été mené au score à un moment donné pendant le match.
                        </p>
                        <p style={{
                            color: 'rgba(51, 51, 51, 0.7)',
                            fontSize: '0.8rem',
                            lineHeight: 1.5,
                            marginBottom: 'var(--spacing-lg)',
                            fontWeight: 600
                        }}>
                            <strong>Exemples :</strong><br />
                            • Tu perds 0-2, puis tu gagnes 6-2<br />
                            • Tu perds 3-5, puis tu gagnes 6-5<br />
                            • Tu mènes tout le temps et gagnes 6-0 (pas une remontada)
                        </p>
                        <button
                            onClick={() => setShowRemontadaInfo(false)}
                            style={{
                                width: '100%',
                                padding: 0,
                                border: 'none',
                                background: 'none'
                            }}
                        >
                            <div className="btn-primary">
                                <div className="btn-primary-shadow" />
                                <div className="btn-primary-content">
                                    Compris !
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
