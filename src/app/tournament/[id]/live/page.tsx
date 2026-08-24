'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    subscribeToTournament,
    startTournamentMatch,
    getNextPendingMatch
} from '@/lib/firebase/tournaments';
import { Tournament, TournamentMatch } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    PlayIcon,
    CheckCircleIcon,
    ClockIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { PageHeader } from '@/components/common/ui';
import s from './page.module.css';

export default function TournamentLivePage() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;
    const { user, initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isStartingMatch, setIsStartingMatch] = useState(false);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!tournamentId) return;

        const unsubscribe = subscribeToTournament(tournamentId, (updatedTournament) => {
            if (!updatedTournament) {
                router.push('/dashboard');
                return;
            }

            setTournament(updatedTournament);
            setIsLoading(false);

            // Redirect based on status
            if (updatedTournament.status === 'waiting' || updatedTournament.status === 'team_setup') {
                router.push(`/tournament/${tournamentId}`);
            } else if (updatedTournament.status === 'completed') {
                router.push(`/tournament/${tournamentId}/results`);
            }
        });

        return () => unsubscribe();
    }, [tournamentId, router]);

    const isHost = user?.userId === tournament?.hostId;

    const handleStartMatch = async (match: TournamentMatch) => {
        if (!tournament) return;

        setIsStartingMatch(true);
        setError('');

        try {
            await startTournamentMatch(tournamentId, match.matchId);
            // Redirect to game creation with tournament context
            const searchParams = new URLSearchParams({
                tournamentId,
                matchId: match.matchId,
                team1: JSON.stringify(match.team1),
                team2: JSON.stringify(match.team2),
                format: tournament.format,
                venueId: tournament.venueId,
                venueName: tournament.venueName
            });
            router.push(`/tournament/${tournamentId}/match?${searchParams.toString()}`);
        } catch (err) {
            console.error('Error starting match:', err);
            setError('Erreur lors du lancement du match');
        } finally {
            setIsStartingMatch(false);
        }
    };

    if (isLoading || !tournament) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    const nextMatch = getNextPendingMatch(tournament);
    const completedMatches = tournament.matches.filter(m => m.status === 'completed').length;
    const totalMatches = tournament.matches.filter(m => m.status !== 'bye').length;

    /*
     * La hauteur d'une colonne du tableau à élimination.
     *
     * Tous les tours partagent la hauteur du PREMIER et répartissent leurs
     * matchs dedans : c'est ce qui aligne un match sur le milieu des deux
     * matchs qui l'alimentent. La valeur descend dans le CSS par
     * `--hauteur-colonne`, seule chose que la feuille de styles ne peut pas
     * savoir toute seule.
     */
    const HAUTEUR_MATCH = 52;
    const ECART_MATCHS = 8;
    const hauteurColonne = tournament.bracket
        ? `${tournament.bracket[0].matches.length * (HAUTEUR_MATCH + ECART_MATCHS)}px`
        : '0px';

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <PageHeader title={tournament.mode === 'round_robin' ? 'Classement' : 'Bracket'} back={'/dashboard'} />

                {error && <div className={`error-box ${s.errorBox}`}>{error}</div>}

                <div className={s.progress}>
                    <p className={s.progressLabel}>Progression</p>
                    <p className={s.progressValue}>{completedMatches} / {totalMatches} matchs</p>
                </div>

                {/* ─── Championnat : le classement ───────────────────────────── */}
                {tournament.mode === 'round_robin' && tournament.standings && (
                    <div className={s.section}>
                        <h2 className={s.sectionTitle}>Classement</h2>
                        <div className={s.table}>
                            <div className={s.tableHead}>
                                <span>Equipe</span>
                                <span className={s.stat}>J</span>
                                <span className={s.stat}>V</span>
                                <span className={s.stat}>D</span>
                                <span className={s.stat}>+/-</span>
                                <span className={s.stat}>Pts</span>
                            </div>

                            {tournament.standings.map((standing, index) => {
                                const premier = index === 0;
                                return (
                                    <div
                                        key={standing.teamId}
                                        className={`${s.tableRow} ${premier ? s.tableRowLeader : ''}`}
                                    >
                                        <span className={s.teamCell}>
                                            <span className={`${s.rank} ${premier ? s.rankLeader : ''}`}>
                                                {index + 1}
                                            </span>
                                            <span className={s.ellipsis}>{standing.teamName}</span>
                                        </span>
                                        <span className={s.stat}>{standing.played}</span>
                                        <span className={`${s.stat} ${s.statWins}`}>{standing.wins}</span>
                                        <span className={`${s.stat} ${s.statLosses}`}>{standing.losses}</span>
                                        <span className={s.stat}>{standing.goalsFor - standing.goalsAgainst}</span>
                                        <span className={`${s.stat} ${s.statPoints}`}>{standing.points}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Élimination : l'arbre ─────────────────────────────────── */}
                {tournament.mode === 'bracket' && tournament.bracket && (
                    <div className={s.section}>
                        <h2 className={`${s.sectionTitle} ${s.sectionTitleCentered}`}>Bracket</h2>
                        <div className={s.bracketScroll}>
                            <div className={s.bracketRounds}>
                                {tournament.bracket.map((round, roundIdx) => (
                                    <div key={round.roundNumber} className={s.bracketRound}>
                                        <p className={s.roundName}>{round.roundName}</p>

                                        <div
                                            className={`${s.bracketColumn} ${roundIdx === 0 ? s.bracketColumnFirst : ''}`}
                                            style={{ '--hauteur-colonne': hauteurColonne } as CSSProperties}
                                        >
                                            {round.matches.map((match) => {
                                                const exemption = match.status === 'bye';
                                                const enCours = match.status === 'in_progress';
                                                const termine = match.status === 'completed';
                                                const pret = match.status === 'pending'
                                                    && !!match.team1.teamId && !!match.team2.teamId;

                                                const gagnant1 = match.winnerId === match.team1.teamId;
                                                const gagnant2 = match.winnerId === match.team2.teamId;
                                                const place2Vide = exemption || !match.team2.teamId;

                                                return (
                                                    <div key={match.matchId} className={s.bracketSlot}>
                                                        {roundIdx > 0 && <div className={s.connector} />}

                                                        <div className={[
                                                            s.matchCard,
                                                            exemption ? s.matchCardBye : '',
                                                            enCours ? s.matchCardLive : '',
                                                            termine && !enCours ? s.matchCardDone : '',
                                                            pret ? s.matchCardReady : '',
                                                        ].filter(Boolean).join(' ')}>
                                                            <div className={`${s.matchSide} ${s.matchSideTop} ${gagnant1 ? s.matchSideWinner : ''}`}>
                                                                <span className={[
                                                                    s.matchTeam,
                                                                    gagnant1 ? s.matchTeamWinner : '',
                                                                    !match.team1.teamId ? s.matchTeamEmpty : '',
                                                                ].filter(Boolean).join(' ')}>
                                                                    {match.team1.name || 'TBD'}
                                                                </span>
                                                                {match.score && (
                                                                    <span className={`${s.matchScore} ${gagnant1 ? s.matchScoreWinner : ''}`}>
                                                                        {match.score[0]}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className={`${s.matchSide} ${gagnant2 ? s.matchSideWinner : ''}`}>
                                                                <span className={[
                                                                    s.matchTeam,
                                                                    gagnant2 ? s.matchTeamWinner : '',
                                                                    place2Vide ? s.matchTeamEmpty : '',
                                                                ].filter(Boolean).join(' ')}>
                                                                    {exemption ? '-' : (match.team2.name || 'TBD')}
                                                                </span>
                                                                {match.score && (
                                                                    <span className={`${s.matchScore} ${gagnant2 ? s.matchScoreWinner : ''}`}>
                                                                        {match.score[1]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {roundIdx < tournament.bracket!.length - 1 && (
                                                            <div className={s.connector} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Tous les matchs ───────────────────────────────────────── */}
                <div className={s.section}>
                    <h2 className={s.sectionTitle}>Matchs</h2>
                    <div className={s.matchList}>
                        {tournament.matches
                            .filter(m => m.status !== 'bye')
                            .map((match) => (
                                <div
                                    key={match.matchId}
                                    className={`${s.matchRow} ${match.status === 'in_progress' ? s.matchRowLive : ''}`}
                                >
                                    <div className={s.matchRowBody}>
                                        <div className={s.matchRowTeams}>
                                            <div className={`${s.matchRowSide} ${s.matchRowSideTop}`}>
                                                <span className={`${s.matchRowName} ${match.winnerId === match.team1.teamId ? s.matchRowNameWinner : ''}`}>
                                                    {match.team1.name}
                                                </span>
                                                {match.score && <span className={s.matchRowScore}>{match.score[0]}</span>}
                                            </div>
                                            <div className={s.matchRowSide}>
                                                <span className={`${s.matchRowName} ${match.winnerId === match.team2.teamId ? s.matchRowNameWinner : ''}`}>
                                                    {match.team2.name}
                                                </span>
                                                {match.score && <span className={s.matchRowScore}>{match.score[1]}</span>}
                                            </div>
                                        </div>

                                        <div className={s.matchRowState}>
                                            {match.status === 'completed' && (
                                                <CheckCircleIcon width={24} height={24} className={s.iconDone} />
                                            )}
                                            {match.status === 'in_progress' && (
                                                <div className={s.badgeLive}>EN COURS</div>
                                            )}
                                            {match.status === 'pending' && (
                                                <ClockIcon width={24} height={24} className={s.iconPending} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {isHost && nextMatch && (
                    <button
                        onClick={() => handleStartMatch(nextMatch)}
                        disabled={isStartingMatch}
                        className={s.startButton}
                    >
                        <div className={s.startButtonMain}>
                            <PlayIcon width={20} height={20} />
                            <span>{isStartingMatch ? 'Lancement...' : 'Lancer le match'}</span>
                        </div>
                        {!isStartingMatch && (
                            <span className={s.startButtonTeams}>
                                {nextMatch.team1.name} vs {nextMatch.team2.name}
                            </span>
                        )}
                    </button>
                )}

                {!nextMatch && tournament.status === 'in_progress' && (
                    <div className={s.finishing}>
                        <TrophyIcon width={24} height={24} className={s.iconTrophy} />
                        <p>Tournoi en cours de finalisation...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
