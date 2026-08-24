'use client';

import { useEffect, useState } from 'react';
import PlayerRow from '@/components/common/PlayerRow';
import { usePlayerProfiles } from '@/lib/firebase/usePlayerProfiles';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getGame, getUserGames, subscribeToGame } from '@/lib/firebase/games';
import { subscribeToSession, startGame } from '@/lib/firebase/game-sessions';
import { completeTournamentMatch, getTournament } from '@/lib/firebase/tournaments';
import { Game, Player, GoalPosition, Team } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import { TrophyIcon, HomeIcon, ArrowPathIcon, StarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import EloChangeDisplay from '@/components/game/EloChangeDisplay';
import RankAvatar from '@/components/common/RankAvatar';
import { getRankInfo } from '@/lib/utils/rankUtils';
import styles from '@/styles/content-page.module.css';
import resultsStyles from './results-page.module.css';
import { getMode, isNormalMode } from '@/lib/gamemodes/modes';
import { evaluate } from '@/lib/gamemodes/engine';
import CelebrationList from '@/components/game/CelebrationList';
import { computeCelebrations, pickAnimation } from '@/lib/game/celebrations';
import { RankProgressBar, Button } from '@/components/common/ui';

interface PlayerStats {
    player: Player;
    totalGoals: number;
    byPosition: Record<GoalPosition, number>;
    teamColor: string;
}

/**
 * Gages de fin de partie — correctif du chantier 7.3.
 *
 * BUG CORRIGÉ : les règles de type `end` n'étaient jamais évaluées. Le moteur
 * n'était branché que sur les buts, dans GameBoard — or GameBoard disparaît
 * dès que la partie est terminée, puisque la page redirige vers les résultats.
 * Les gages de fin sont donc affichés ICI, de façon permanente : on les lit
 * après le match, au moment où on les exécute.
 */
export default function GameResultsPage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { user, initialize } = useAuthStore();
    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRematching, setIsRematching] = useState(false);
    const [h2hStats, setH2HStats] = useState<{ team0Wins: number; team1Wins: number } | null>(null);
    // La même source que le lobby et le match : une seule façon d'afficher un
    // joueur dans toute l'application.
    const profils = usePlayerProfiles(
        game?.teams.flatMap(t => t.players.map(p => p.userId)) ?? [],
        { withRank: true },
    );
    const [tournamentUpdated, setTournamentUpdated] = useState(false);

    useEffect(() => {
        initialize();
        // `initialize` vient de Zustand : sa référence est stable, l'ajouter ne
        // change rien à l'exécution — ça dit juste la vérité au compilateur.
    }, [initialize]);

    // Real-time listener: picks up eloChanges even if written after initial load
    useEffect(() => {
        if (!gameId) return;

        const unsubscribe = subscribeToGame(gameId, (gameData) => {
            if (gameData) {
                setGame(gameData);
                setIsLoading(false);
                loadH2HStats(gameData);
                handleTournamentUpdate(gameData);
            } else {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [gameId]);

    const handleTournamentUpdate = async (gameData: Game) => {
        if (gameData.tournamentId && gameData.tournamentMatchId && gameData.status === 'completed' && gameData.winner !== undefined && !tournamentUpdated) {
            setTournamentUpdated(true);
            try {
                const tournament = await getTournament(gameData.tournamentId);
                if (tournament) {
                    const match = tournament.matches.find(m => m.matchId === gameData.tournamentMatchId);
                    if (match) {
                        const winnerTeamId = gameData.winner === 0 ? match.team1.teamId : match.team2.teamId;
                        await completeTournamentMatch(
                            gameData.tournamentId,
                            gameData.tournamentMatchId,
                            gameData.gameId,
                            winnerTeamId,
                            [gameData.score[0], gameData.score[1]]
                        );
                    }
                }
            } catch (err) {
                console.error('Error updating tournament match:', err);
            }
        }
    };

    const loadH2HStats = async (currentGame: Game) => {
        try {
            const hostId = currentGame.hostId;
            const allHostGames = await getUserGames(hostId, 50); // Fetch last 50 games

            const currentTeam0Ids = currentGame.teams[0].players.map(p => p.userId).sort();
            const currentTeam1Ids = currentGame.teams[1].players.map(p => p.userId).sort();

            let team0Wins = 0;
            let team1Wins = 0;

            allHostGames.forEach(g => {
                if (g.status !== 'completed' || g.winner === undefined) return;

                const gTeam0Ids = g.teams[0].players.map(p => p.userId).sort();
                const gTeam1Ids = g.teams[1].players.map(p => p.userId).sort();

                const isSameMatchup =
                    (JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam0Ids) && JSON.stringify(gTeam1Ids) === JSON.stringify(currentTeam1Ids)) ||
                    (JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam1Ids) && JSON.stringify(gTeam1Ids) === JSON.stringify(currentTeam0Ids));

                if (isSameMatchup) {
                    const side0IsTeam0 = JSON.stringify(gTeam0Ids) === JSON.stringify(currentTeam0Ids);
                    if (g.winner === 0) {
                        if (side0IsTeam0) team0Wins++; else team1Wins++;
                    } else {
                        if (side0IsTeam0) team1Wins++; else team0Wins++;
                    }
                }
            });

            setH2HStats({ team0Wins, team1Wins });
        } catch (error) {
            console.error('Error loading H2H stats:', error);
        }
    };

    // Listen for rematch (session update)
    useEffect(() => {
        if (!game?.sessionId || user?.userId === game.hostId) return;

        const unsubscribe = subscribeToSession(game.sessionId, (session) => {
            if (session?.status === 'active' && session.gameId && session.gameId !== gameId) {
                router.push(`/game/${session.gameId}`);
            }
        });

        return () => unsubscribe();
    }, [game?.sessionId, gameId, user?.userId, router]);

    const handleRematch = async () => {
        if (!game || !game.sessionId || isRematching) return;

        setIsRematching(true);
        try {
            // Reset scores for the new game
            const newTeams: [Team, Team] = [
                { ...game.teams[0], score: 0 },
                { ...game.teams[1], score: 0 }
            ];

            const newGame = await startGame(
                game.sessionId,
                newTeams
            );

            router.push(`/game/${newGame.gameId}`);
        } catch (error) {
            console.error('Error starting rematch:', error);
            setIsRematching(false);
        }
    };

    if (isLoading) return (
        <div className="container-center">
            <div className={styles.spinner} />
        </div>
    );

    if (!game) return (
        <div className="container-center">
            <p className="text-secondary">Partie introuvable</p>
        </div>
    );

    const winnerIndex = game.winner;
    const isDraw = winnerIndex === undefined;
    const winningTeam = winnerIndex !== undefined ? game.teams[winnerIndex] : null;

    // Determine if current user won or lost
    const currentUserTeamIndex = game.teams.findIndex(team =>
        team.players.some(p => p.userId === user?.userId)
    );
    const currentUserIsWinner = currentUserTeamIndex !== -1 && currentUserTeamIndex === winnerIndex;
    const hasEloChanges = game.eloChanges && Object.keys(game.eloChanges).length > 0;

    // Rank change for current user
    const userEloChange = user?.userId ? game.eloChanges?.[user.userId] : null;
    const monPack = (user?.userId ? game.packsEarned?.[user.userId] : 0) ?? 0;
    const displayElo = userEloChange?.newElo ?? user?.stats?.elo ?? 1000;
    const newRank = getRankInfo(displayElo);

    // Les célébrations viennent du module partagé (lib/game/celebrations).
    // Cette page dupliquait sa propre table d'ordre des rangs pour détecter
    // une promotion — exactement le même calcul, écrit deux fois.
    const celebrations = userEloChange
        ? computeCelebrations({
            previousElo: userEloChange.previousElo,
            newElo: userEloChange.newElo,
            isRecord: userEloChange.isRecord,
            isMVP: userEloChange.isMVP,
            winStreak: userEloChange.winStreak,
        })
        : [];
    const rankChanged = celebrations.some(c => c.kind === 'grade_up' || c.kind === 'grade_down');
    const rankPromoted = celebrations.some(c => c.kind === 'grade_up');
    // Show rank banner if user is a participant
    const showRankBanner = currentUserTeamIndex !== -1;

    // Calculate detailed stats
    const stats: Record<string, PlayerStats> = {};

    // Initialize stats for all players
    game.teams.forEach(team => {
        team.players.forEach(player => {
            stats[player.userId] = {
                player,
                totalGoals: 0,
                byPosition: {} as Record<GoalPosition, number>,
                teamColor: team.color
            };
        });
    });

    // Count goals
    game.goals.forEach(goal => {
        if (stats[goal.scoredBy]) {
            stats[goal.scoredBy].totalGoals += 1;
            if (goal.position) {
                stats[goal.scoredBy].byPosition[goal.position] = (stats[goal.scoredBy].byPosition[goal.position] || 0) + 1;
            }
        }
    });

    const sortedStats = Object.values(stats).sort((a, b) => b.totalGoals - a.totalGoals);

    // MVP : on lit celui calculé et stocké côté serveur (chantier 1.2).
    // Cette page recalculait auparavant son PROPRE MVP (« celui qui a marqué le
    // plus de buts »), 3e définition concurrente dans le projet — elle pouvait
    // donc désigner un joueur différent de celui qui a réellement reçu le
    // bonus d'ELO. Le repli sur le meilleur buteur ne sert que pour les
    // anciennes parties enregistrées avant l'existence de `mvpId`.
    const mvpId = game.mvpId ?? sortedStats[0]?.player.userId;

    const mode = getMode(game.modeId);
    const endGages = game.winner !== undefined
        ? evaluate(mode, { kind: 'end', teams: game.teams, winner: game.winner })
        : [];

    const positionLabels: Record<GoalPosition, string> = {
        attack: 'Attaque',
        defense: 'Défense',
        midfield: 'Milieu',
        goalkeeper: 'Gardien'
    };

    const getTrophyClass = () => {
        if (isDraw) return resultsStyles.drawTrophy;
        return resultsStyles[`${winningTeam?.color}Trophy`] || resultsStyles.drawTrophy;
    };

    // Helper to get a player's team index
    const getPlayerTeamIndex = (userId: string): number => {
        if (game.teams[0].players.some(p => p.userId === userId)) return 0;
        return 1;
    };

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            {/* Full-screen Lottie animation overlay */}
            {!isDraw && hasEloChanges && currentUserTeamIndex !== -1 && (
                <EloChangeDisplay isWinner={currentUserIsWinner} override={pickAnimation(celebrations)} />
            )}

            <div className={styles.contentWrapper}>
                <div className={resultsStyles.container}>

                    {/* Pack débloqué — chantier 4.7.
                        En tête de page, avant les gages et les stats : c'est la
                        seule chose ici sur laquelle le joueur peut AGIR tout de
                        suite. Lu sur la partie et non sur la réponse de la
                        route, donc toujours là après un rafraîchissement. */}
                    {monPack > 0 && (
                        <button type="button"
                            className={resultsStyles.packUnlocked}
                            onClick={() => router.push('/collection')}
                        >
                            <span className={resultsStyles.packUnlockedTitle}>
                                {monPack > 1 ? `${monPack} packs débloqués` : 'Pack débloqué'}
                            </span>
                            <span className={resultsStyles.packUnlockedText}>
                                Ouvre-le depuis ta collection →
                            </span>
                        </button>
                    )}

                    {/* Gages de fin de partie — chantier 7.3.
                        Affichés de façon permanente, pas en notification : on les
                        lit après le match, au moment où on les exécute. */}
                    {!isNormalMode(game.modeId) && (
                        <div className={resultsStyles.gageCard}>
                            <div className={resultsStyles.gageHeader}>Mode {mode.name}</div>
                            {endGages.length === 0 ? (
                                <p className={resultsStyles.gageEmpty}>Aucun gage de fin de partie.</p>
                            ) : (
                                <ul className={resultsStyles.gageList}>
                                    {endGages.map(gage => (
                                        <li key={gage.ruleId} className={resultsStyles.gageItem}>
                                            <span className={resultsStyles.gageTitle}>{gage.title}</span>
                                            <span className={resultsStyles.gageText}>{gage.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Trophy & Winner */}
                    <div className={resultsStyles.trophyContainer}>
                        <div className={`${resultsStyles.trophyCircle} ${getTrophyClass()}`}>
                            <TrophyIcon className={resultsStyles.trophyIcon} />
                        </div>

                        <h1 className={resultsStyles.winnerTitle}>
                            {isDraw ? 'Match Nul !' : `Victoire ${winningTeam?.color === 'blue' ? 'Bleue' :
                                winningTeam?.color === 'red' ? 'Rouge' :
                                    winningTeam?.color === 'green' ? 'Verte' :
                                        winningTeam?.color === 'yellow' ? 'Jaune' :
                                            winningTeam?.color === 'orange' ? 'Orange' :
                                                winningTeam?.color === 'purple' ? 'Violette' : 'Équipe'} !`}
                        </h1>
                        <p className={resultsStyles.finalScore}>
                            {(() => {
                                const userTeamIndex = game.teams.findIndex(team =>
                                    team.players.some(p => p.userId === user?.userId)
                                );
                                if (userTeamIndex === -1) return `${game.score[0]} — ${game.score[1]}`;
                                const opponentTeamIndex = userTeamIndex === 0 ? 1 : 0;
                                return `${game.score[userTeamIndex]} — ${game.score[opponentTeamIndex]}`;
                            })()}
                        </p>
                    </div>

                    {/* Annonces : montée de grade, record battu, série en cours.
                        Placées avant la bannière de rang : ce sont les nouvelles,
                        la bannière n'est que l'état courant. */}
                    <CelebrationList celebrations={celebrations} />

                    {/* Rank banner for current user */}
                    {showRankBanner && (
                        <div className={resultsStyles.rankBanner}>
                            {rankChanged && (
                                <div className={`${resultsStyles.rankChangeBadge} ${rankPromoted ? resultsStyles.rankPromoted : resultsStyles.rankDemoted}`}>
                                    {rankPromoted ? 'PROMOTION' : 'RÉGRESSION'}
                                </div>
                            )}
                            <div className={resultsStyles.rankBannerContent}>
                                <RankAvatar elo={displayElo} size="lg" />
                                <div className={resultsStyles.rankBannerInfo}>
                                    <span className={resultsStyles.rankBannerLabel}>Votre rang</span>
                                    <span className={resultsStyles.rankBannerName}>
                                        {newRank.label} {newRank.romanLevel}
                                    </span>
                                    {userEloChange ? (
                                        <span className={`${resultsStyles.rankBannerElo} ${currentUserIsWinner ? resultsStyles.eloGain : resultsStyles.eloLoss}`}>
                                            {displayElo} Elo&nbsp;
                                            ({currentUserIsWinner ? '+' : ''}{userEloChange.eloChange})
                                        </span>
                                    ) : (
                                        <span className={resultsStyles.rankBannerElo} style={{ color: 'rgba(51,51,51,0.5)' }}>
                                            {displayElo} Elo
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Progression vers le grade suivant.
                                Sa place la plus utile est ICI, pas seulement sur le
                                profil : c'est juste après une partie qu'on se demande
                                « il me reste combien ? », et c'est cette réponse qui
                                fait relancer une partie. */}
                            <RankProgressBar elo={displayElo} />
                        </div>
                    )}

                    {/* H2H Stats */}
                    {h2hStats && (h2hStats.team0Wins > 0 || h2hStats.team1Wins > 0) && (
                        <div className={resultsStyles.h2hContainer}>
                            <div className={resultsStyles.h2hHeader}>
                                <span style={{ color: `var(--team-${game.teams[0].color})` }}>{h2hStats.team0Wins}</span>
                                <span className={resultsStyles.h2hTitle}>FACE À FACE</span>
                                <span style={{ color: `var(--team-${game.teams[1].color})` }}>{h2hStats.team1Wins}</span>
                            </div>
                            <div className={resultsStyles.h2hBar}>
                                <div className={resultsStyles.h2hFill}
                                    style={{
                                        width: `${(h2hStats.team0Wins / (h2hStats.team0Wins + h2hStats.team1Wins)) * 100}%`,
                                        backgroundColor: `var(--team-${game.teams[0].color})`
                                    }}
                                />
                                <div className={resultsStyles.h2hFill}
                                    style={{
                                        width: `${(h2hStats.team1Wins / (h2hStats.team0Wins + h2hStats.team1Wins)) * 100}%`,
                                        backgroundColor: `var(--team-${game.teams[1].color})`
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className={resultsStyles.statsGrid}>
                        {sortedStats.map((stat) => {
                            const playerElo = game.eloChanges?.[stat.player.userId];
                            const isPlayerWinner = winnerIndex !== undefined && getPlayerTeamIndex(stat.player.userId) === winnerIndex;

                            return (
                                <div key={stat.player.userId} className={resultsStyles.statCard}>
                                    {/* La MÊME carte que le lobby et le match.
                                        C'est ici qu'on a le plus de temps pour la
                                        regarder — et le plus de place. */}
                                    <PlayerRow username={stat.player.username}
                                        profile={profils[stat.player.userId]}
                                        className={resultsStyles.statBanner}
                                        style={{ borderColor: `var(--team-${stat.teamColor})` }}
                                        trailing={stat.player.userId === mvpId ? (
                                            /* Pas de condition sur les buts : le MVP peut être un
                                               défenseur qui n'a pas marqué. */
                                            <span className={resultsStyles.mvpBadge}>
                                                <StarIcon width={8} height={8} /> MVP
                                            </span>
                                        ) : undefined}
                                    />

                                    {/* Le bloc crème porte les CHIFFRES, la
                                        bannière porte l'identité. Séparés
                                        volontairement : mélanger les deux, c'est
                                        remettre des chiffres sur une image. */}
                                    <div className={resultsStyles.statBody}>
                                    <p className={resultsStyles.playerGoals}>
                                        {stat.totalGoals} {stat.totalGoals > 1 ? 'buts' : 'but'}
                                    </p>

                                    {stat.totalGoals > 0 && (
                                        <div className={resultsStyles.positionBreakdown}>
                                            {Object.entries(stat.byPosition).map(([pos, count]) => (
                                                <span key={pos} className={resultsStyles.positionPill}>
                                                    {count} {positionLabels[pos as GoalPosition]}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Elo change inline */}
                                    {playerElo && (
                                        <div className={resultsStyles.eloRow}>
                                            <span className={resultsStyles.eloLabel}>ELO</span>
                                            <div className={resultsStyles.eloValues}>
                                                <span className={resultsStyles.eloRating}>{playerElo.newElo}</span>
                                                <span className={`${resultsStyles.eloBadge} ${isPlayerWinner ? resultsStyles.eloBadgeGain : resultsStyles.eloBadgeLoss}`}>
                                                    {isPlayerWinner ? (
                                                        <ArrowTrendingUpIcon className={resultsStyles.eloArrow} />
                                                    ) : (
                                                        <ArrowTrendingDownIcon className={resultsStyles.eloArrow} />
                                                    )}
                                                    {isPlayerWinner ? '+' : ''}{playerElo.eloChange}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className={resultsStyles.actions}>
                        {game.tournamentId ? (
                            // Tournament match - show return to tournament
                            <Button onClick={() => router.push(`/tournament/${game.tournamentId}/live`)} fullWidth>
                                <TrophyIcon width={20} height={20} />
                                <span>Retour au tournoi</span>
                            </Button>
                        ) : user?.userId === game.hostId ? (
                            <Button onClick={handleRematch} disabled={isRematching} fullWidth>
<ArrowPathIcon width={20} height={20} className={isRematching ? 'spinner-ring' : undefined} />
                                        <span>{isRematching ? 'Lancement...' : 'Rejouer'}</span>
</Button>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', width: '100%' }}>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', opacity: '0.6', textTransform: 'uppercase' }}>
                                    En attente de l&apos;hôte...
                                </p>
                            </div>
                        )}

                        <Button onClick={() => router.push('/dashboard')} variant="secondary" fullWidth>
                            <HomeIcon width={20} height={20} />
                            <span>Tableau de bord</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
