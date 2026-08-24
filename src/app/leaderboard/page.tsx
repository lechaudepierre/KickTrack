'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { useFeature } from '@/lib/features';
import { getVenueLeaderboard, getGlobalLeaderboard, getFriendsLeaderboard, LeaderboardEntry } from '@/lib/firebase/games';
import { orderedLadders, LADDERS, type LadderId } from '@/lib/game/ladders';
import { getFriends } from '@/lib/firebase/friends';
import { Venue } from '@/types';

import BottomNav from '@/components/common/BottomNav';
import VenueDropdown from '@/components/venues/VenueDropdown';
import {
    UsersIcon,
    GlobeAltIcon,
    MagnifyingGlassIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';
import RankAvatar from '@/components/common/RankAvatar';
import PlayerBanner from '@/components/common/PlayerBanner';
import { PageHeader } from '@/components/common/ui';
import { resolveBanner } from '@/lib/collection/banner';
import RankMovement from '@/components/common/RankMovement';
import PlayerTitle from '@/components/common/PlayerTitle';
import { computeMovements } from '@/lib/game/ranking';

type FilterType = 'general' | 'friends';


type DisplayEntry =
    | { type: 'player'; entry: LeaderboardEntry; rank: number }
    | { type: 'separator' };

function buildDisplayEntries(
    leaderboard: LeaderboardEntry[],
    currentUserId: string | undefined,
    applySlicing: boolean,
): DisplayEntry[] {
    const n = leaderboard.length;
    if (n === 0) return [];

    if (!applySlicing) {
        return leaderboard.map((entry, i) => ({ type: 'player', entry, rank: i + 1 }));
    }

    const myIndex = currentUserId
        ? leaderboard.findIndex(p => p.userId === currentUserId)
        : -1;

    const TOP = 20;
    const CONTEXT = 5;
    const BOTTOM = 10;

    // Build index segments [start, end] inclusive
    const segments: [number, number][] = [];

    // Top 20. Le podium reprend les trois premiers au-dessus, volontairement :
    // il met en avant, la liste fait référence. Les deux ont leur rôle.
    segments.push([0, Math.min(TOP - 1, n - 1)]);

    // Context around user (only if outside top 20)
    if (myIndex >= TOP) {
        const cStart = Math.max(TOP, myIndex - CONTEXT);
        const cEnd = Math.min(n - 1, myIndex + CONTEXT);
        segments.push([cStart, cEnd]);
    }

    // Bottom 10
    const bottomStart = Math.max(0, n - BOTTOM);
    if (bottomStart > Math.min(TOP - 1, n - 1)) {
        segments.push([bottomStart, n - 1]);
    }

    // Sort and merge overlapping/adjacent segments
    segments.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const seg of segments) {
        if (merged.length === 0 || seg[0] > merged[merged.length - 1][1] + 1) {
            merged.push([seg[0], seg[1]]);
        } else {
            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], seg[1]);
        }
    }

    // Convert to display entries with separators between segments
    const result: DisplayEntry[] = [];
    for (let s = 0; s < merged.length; s++) {
        if (s > 0) result.push({ type: 'separator' });
        const [start, end] = merged[s];
        for (let i = start; i <= end; i++) {
            result.push({ type: 'player', entry: leaderboard[i], rank: i + 1 });
        }
    }
    return result;
}

export default function LeaderboardPage() {
    const router = useRouter();
    const { user: currentUser, initialize } = useAuthStore();
    const v2Enabled = useFeature('v2');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filter type state
    const [filterType, setFilterType] = useState<FilterType>('general');
    // Échelle affichée — chantier 7.11. Le général reste le défaut : c'est le
    // classement de référence, et c'est ce qu'on doit voir en arrivant.
    const [ladder, setLadder] = useState<LadderId>('normal');
    const [friendIds, setFriendIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Race condition protection: only the latest loadLeaderboard call can update state
    const loadCallIdRef = useRef(0);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    /*
     * On dépend des CHAMPS du joueur, pas de son objet.
     *
     * `currentUser` vient d'un abonnement temps réel : sa référence change à
     * chaque mise à jour de son profil — après chaque partie, donc. Le lister
     * tel quel rechargerait tout le classement à chaque fois. Son identifiant
     * et son pseudo, eux, ne bougent quasiment jamais.
     */
    const monId = currentUser?.userId;
    const monPseudo = currentUser?.username;

    const loadFriendIds = useCallback(async () => {
        if (!monId) return;
        try {
            const friends = await getFriends(monId);
            // Include current user in the list for friends leaderboard
            setFriendIds([monId, ...friends.map(f => f.userId)]);
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }, [monId]);

    const loadLeaderboard = useCallback(async () => {
        const callId = ++loadCallIdRef.current;
        setIsLoading(true);
        try {
            const venueId = selectedVenue?.venueId || 'all';
            let data: LeaderboardEntry[];

            if (ladder !== 'normal') {
                // Les échelles secondaires n'ont ni filtre d'amis ni filtre de
                // stade : elles ne tiennent qu'un ELO. Y ajouter des filtres
                // qui ne s'appuient sur rien serait mentir sur la donnée.
                data = await getGlobalLeaderboard(ladder);
            } else if (filterType === 'friends') {
                data = await getFriendsLeaderboard(friendIds, venueId);
            } else if (!selectedVenue) {
                data = await getGlobalLeaderboard('normal');
            } else {
                data = await getVenueLeaderboard(selectedVenue.venueId);
            }

            // Race condition guard: ignore result if a newer call was made
            if (callId !== loadCallIdRef.current) return;

            // Diagnostic + self-healing: if current user is missing from global leaderboard
            if (ladder === 'normal' && filterType === 'general' && !selectedVenue && monId) {
                const userInList = data.some(p => p.userId === monId);
                if (!userInList && data.length > 0) {
                    // Cross-check: does the user exist in friends leaderboard (same games, different filter)?
                    const crossCheck = await getFriendsLeaderboard([monId], 'all');
                    if (crossCheck.length > 0) {
                        console.warn(
                            `[Leaderboard Diagnostic] User "${monPseudo}" (${monId}) is MISSING from global leaderboard (${data.length} players) but EXISTS in friends cross-check with ${crossCheck[0].totalGames} games, Elo: ${crossCheck[0].elo}. Injecting user into global list.`
                        );
                        data.push(crossCheck[0]);
                        data.sort((a, b) => {
                            const eloA = a.elo || 1000;
                            const eloB = b.elo || 1000;
                            if (eloA !== eloB) return eloB - eloA;
                            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
                            return b.wins - a.wins;
                        });
                    }
                }
            }

            setLeaderboard(data);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            if (callId === loadCallIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [selectedVenue, filterType, friendIds, ladder, monId, monPseudo]);

    useEffect(() => {
        loadFriendIds();
    }, [loadFriendIds]);

    useEffect(() => {
        loadLeaderboard();
    }, [loadLeaderboard]);

    const hasData = leaderboard.length > 0;

    // Évolution sur la semaine, reconstituée depuis l'historique d'ELO déjà
    // stocké sur chaque profil. Recalculée seulement quand le classement change.
    const movements = useMemo(
        () => computeMovements(leaderboard, new Date().toISOString().split('T')[0]),
        [leaderboard]
    );

    // Position du joueur connecté, pour le rappel en tête.
    const myPosition = useMemo(() => {
        if (!currentUser) return null;
        const index = leaderboard.findIndex(p => p.userId === currentUser.userId);
        return index === -1 ? null : { entry: leaderboard[index], rank: index + 1 };
    }, [leaderboard, currentUser]);

    const isSearching = searchQuery.trim().length > 0;
    const showPodium = !isSearching && leaderboard.length > 0;
    const searchFiltered = isSearching
        ? leaderboard
            .map((entry, i) => ({ entry, rank: i + 1 }))
            .filter(({ entry }) => entry.username.toLowerCase().includes(searchQuery.trim().toLowerCase()))
        : null;

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <PageHeader title="Classement" back={false} />

                {/* Choix de l'échelle — chantier 7.11.
                    N'apparaît que s'il y a autre chose que le classement de
                    référence : un onglet seul ne choisit rien. */}
                {orderedLadders().length > 1 && (
                    <div className={styles.ladderTabs} role="tablist" aria-label="Choisir le classement">
                        {orderedLadders().map(l => (
                            <button key={l.id} type="button" role="tab"
                                aria-selected={ladder === l.id}
                                className={`${styles.ladderTab} ${ladder === l.id ? styles.ladderTabActive : ''}`}
                                onClick={() => setLadder(l.id)}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Le classement de référence doit être NOMMÉ. Deux onglets
                    côte à côte se valent visuellement : sans cette phrase,
                    personne ne sait lequel compte. */}
                <p className={styles.ladderNote}>{LADDERS[ladder].description}</p>

                {/* Filtre de périmètre : général ou entre amis.
                    Sans objet hors du classement de référence. */}
                {ladder === 'normal' && (
                <div className={styles.filterTabs}>
                    <button onClick={() => setFilterType('general')}
                        className={`${styles.filterTab} ${filterType === 'general' ? styles.filterTabActive : ''}`}
                    >
                        <GlobeAltIcon width={20} height={20} />
                        <span>General</span>
                    </button>
                    <button onClick={() => setFilterType('friends')}
                        className={`${styles.filterTab} ${filterType === 'friends' ? styles.filterTabActive : ''}`}
                    >
                        <UsersIcon width={20} height={20} />
                        <span>Amis</span>
                    </button>
                </div>
                )}

                {/* Filtre de lieu. Regroupé avec les onglets ci-dessus : la
                    recherche était coincée entre les deux, ce qui les faisait
                    passer pour deux réglages sans rapport.
                    Masqué hors du classement de référence : les compteurs par
                    stade ne sont tenus que globalement. */}
                {ladder === 'normal' && (
                <div className={styles.filterSection}>
                    <VenueDropdown selectedVenue={selectedVenue}
                        onSelectVenue={setSelectedVenue}
                        showNoneOption={true}
                        noneLabel="Tous les stades"
                    />
                </div>
                )}

                {/* Recherche : trouver quelqu'un DANS le classement filtré. */}
                <div className={styles.searchContainer}>
                    <MagnifyingGlassIcon className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Rechercher un joueur…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    {isSearching && (
                        <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
                            <XMarkIcon width={16} height={16} />
                        </button>
                    )}
                </div>


                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
                        <div className="spinner-ring" style={{ width: '48px', height: '48px', borderWidth: '4px', borderTopColor: 'transparent', borderRadius: 'var(--radius-full)' }} />
                    </div>
                ) : !hasData ? (
                    <div className={styles.emptyState}>
                        {/* Le message doit correspondre à ce qui est RÉELLEMENT
                            filtré : « aucun classement pour ce stade » sur le
                            Blitz, où aucun stade n'est sélectionné, laissait
                            croire à un bug. */}
                        {ladder !== 'normal'
                            ? `Personne n'a encore joué en ${LADDERS[ladder].label}.`
                            : filterType === 'friends'
                                ? 'Ajoute des amis pour voir leur classement !'
                                : selectedVenue
                                    ? 'Aucun classement disponible pour ce stade'
                                    : 'Aucun classement disponible pour le moment'
                        }
                    </div>
                ) : (
                    <>
                        {/* Ta position, rappelée en tête. Quand on est 47e sur 141,
                            il faut faire défiler pour se trouver — or c'est
                            l'information qu'on vient chercher en premier. */}
                        {myPosition && !isSearching && (
                            <button
                                className={styles.myPosition}
                                onClick={() => router.push(`/profile/${myPosition.entry.userId}`)}
                            >
                                <span className={styles.myPositionRank}>
                                    <span className={styles.myPositionNumber}>{myPosition.rank}</span>
                                    <RankMovement movement={movements[myPosition.entry.userId]} />
                                </span>
                                <span className={styles.myPositionInfo}>
                                    <span className={styles.myPositionLabel}>Ta position</span>
                                    <span className={styles.myPositionElo}>
                                        {myPosition.entry.elo || 1000} Elo
                                    </span>
                                    <span className={styles.myPositionTotal}>
                                        sur {leaderboard.length} joueurs
                                    </span>
                                </span>
                                <RankAvatar elo={myPosition.entry.elo} size="md" />
                            </button>
                        )}

                        {/* Podium. Masqué pendant une recherche : chercher quelqu'un,
                            c'est vouloir une liste, pas un tableau d'honneur. */}
                        {showPodium && (
                            <div className={styles.podium}>
                                {/* 2nd Place */}
                                {leaderboard[1] && (
                                    <div className={`${styles.podiumSpot} ${styles.secondPlace}`}
                                        onClick={() => router.push(`/profile/${leaderboard[1].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <RankAvatar elo={leaderboard[1].elo} size="lg" />
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[1].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[1].elo || 1000} Elo</div>
                                    </div>
                                )}

                                {/* 1st Place */}
                                {leaderboard[0] && (
                                    <div className={`${styles.podiumSpot} ${styles.firstPlace}`}
                                        onClick={() => router.push(`/profile/${leaderboard[0].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <RankAvatar elo={leaderboard[0].elo} size="xl" />
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[0].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[0].elo || 1000} Elo</div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {leaderboard[2] && (
                                    <div className={`${styles.podiumSpot} ${styles.thirdPlace}`}
                                        onClick={() => router.push(`/profile/${leaderboard[2].userId}`)}
                                    >
                                        <div className={styles.avatarContainer}>
                                            <RankAvatar elo={leaderboard[2].elo} size="lg" />
                                        </div>
                                        <div className={styles.podiumName}>{leaderboard[2].username}</div>
                                        <div className={styles.podiumScore}>{leaderboard[2].elo || 1000} Elo</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* List */}
                        {isSearching && searchFiltered!.length === 0 ? (
                            <div className={styles.emptyState}>Aucun joueur trouvé pour &quot;{searchQuery}&quot;</div>
                        ) : (
                            <div className={styles.listContainer}>
                                <div className={styles.listHeader}>
                                    <div style={{ textAlign: 'center' }}>#</div>
                                    <div>Joueur</div>
                                    {/* « V » pour victoires. À revoir quand les saisons
                                        existeront : Sacha veut le total de la saison
                                        en cours, pas le cumul de tous les temps. */}
                                    <div style={{ textAlign: 'center' }} title="Victoires">V</div>
                                    <div style={{ textAlign: 'center' }}>Elo</div>
                                </div>

                                {isSearching
                                    ? searchFiltered!.map(({ entry: player, rank }) => {
                                        // La couleur du texte suit la bannière réellement
                                        // affichée, plus une liste de pseudos en dur.
                                        const onBanner = !!resolveBanner(player.bannerId,
                                            v2Enabled ? player.equipped : null);
                                        return (
                                            <PlayerBanner key={player.userId}
                                                bannerId={player.bannerId}
                                                equipped={v2Enabled ? player.equipped : null}
                                                className={`${styles.listItem} ${currentUser?.userId === player.userId ? styles.myItem : ''}`}
                                                onClick={() => router.push(`/profile/${player.userId}`)}
                                            >
                                                <div className={`${styles.rank} ${onBanner ? styles.textOnBanner : ''}`}>
                                                    <span className={styles.rankNumber}>{rank}</span>
                                                    <RankMovement movement={movements[player.userId]} />
                                                </div>
                                                <div className={styles.playerInfo}>
                                                    <RankAvatar elo={player.elo} size="md" />
                                                    <div className={styles.playerNameBlock}>
                                                        <span className={`${styles.playerName} ${onBanner ? styles.textOnBanner : ''}`}>
                                                            {player.username}
                                                            {currentUser?.userId === player.userId && ' (Moi)'}
                                                        </span>
                                                        {/* Le titre se lit SOUS le pseudo, et prend la
                                                            couleur de la bannière. */}
                                                        <PlayerTitle equipped={v2Enabled ? player.equipped : null} compact />
                                                    </div>
                                                </div>
                                                <div className={`${styles.statCol} ${onBanner ? styles.textOnBanner : ''}`}>{player.wins}</div>
                                                <div className={`${styles.statCol} ${styles.winRate} ${onBanner ? styles.textOnBanner : ''}`}>
                                                    {player.elo || 1000}
                                                </div>
                                            </PlayerBanner>
                                        );
                                    })
                                    : buildDisplayEntries(
                                        leaderboard,
                                        currentUser?.userId,
                                        filterType === 'general'
                                    ).map((item, idx) => {
                                        if (item.type === 'separator') {
                                            return (
                                                <div key={`sep-${idx}`} className={styles.listSeparator}>
                                                    <span className={styles.listSeparatorDots}>⋮</span>
                                                </div>
                                            );
                                        }
                                        const { entry: player, rank } = item;
                                        // La couleur du texte suit la bannière réellement
                                        // affichée, plus une liste de pseudos en dur.
                                        const onBanner = !!resolveBanner(player.bannerId,
                                            v2Enabled ? player.equipped : null);
                                        return (
                                            <PlayerBanner key={player.userId}
                                                bannerId={player.bannerId}
                                                equipped={v2Enabled ? player.equipped : null}
                                                className={`${styles.listItem} ${currentUser?.userId === player.userId ? styles.myItem : ''}`}
                                                onClick={() => router.push(`/profile/${player.userId}`)}
                                            >
                                                <div className={`${styles.rank} ${onBanner ? styles.textOnBanner : ''}`}>
                                                    <span className={styles.rankNumber}>{rank}</span>
                                                    <RankMovement movement={movements[player.userId]} />
                                                </div>
                                                <div className={styles.playerInfo}>
                                                    <RankAvatar elo={player.elo} size="md" />
                                                    <div className={styles.playerNameBlock}>
                                                        <span className={`${styles.playerName} ${onBanner ? styles.textOnBanner : ''}`}>
                                                            {player.username}
                                                            {currentUser?.userId === player.userId && ' (Moi)'}
                                                        </span>
                                                        {/* Le titre se lit SOUS le pseudo, et prend la
                                                            couleur de la bannière. */}
                                                        <PlayerTitle equipped={v2Enabled ? player.equipped : null} compact />
                                                    </div>
                                                </div>
                                                <div className={`${styles.statCol} ${onBanner ? styles.textOnBanner : ''}`}>{player.wins}</div>
                                                <div className={`${styles.statCol} ${styles.winRate} ${onBanner ? styles.textOnBanner : ''}`}>
                                                    {player.elo || 1000}
                                                </div>
                                            </PlayerBanner>
                                        );
                                    })
                                }
                            </div>
                        )}

                        {/* Created by section */}
                        <div className={styles.createdBySection}>
                            <span className={styles.createdByLabel}>Fondateurs</span>
                            <span className={styles.createdByNames}>
                                Romain Brantegem · Pierre Léchaudé · Sacha Theben
                            </span>
                        </div>
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
