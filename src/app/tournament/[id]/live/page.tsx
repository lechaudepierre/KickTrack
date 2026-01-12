'use client';

import { useState, useEffect } from 'react';
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
    ArrowLeftIcon,
    PlayIcon,
    CheckCircleIcon,
    ClockIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

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
                targetScore: tournament.targetScore.toString(),
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

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>
                        {tournament.mode === 'round_robin' ? 'Classement' : 'Bracket'}
                    </h1>
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                {/* Progress */}
                <div style={{
                    background: '#FFD700',
                    border: '3px solid #333333',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.7)', marginBottom: '4px' }}>
                        Progression
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333333' }}>
                        {completedMatches} / {totalMatches} matchs
                    </p>
                </div>

                {/* Round Robin: Standings */}
                {tournament.mode === 'round_robin' && tournament.standings && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            Classement
                        </h2>
                        <div style={{
                            background: 'var(--color-beige)',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            {/* Header */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr repeat(5, 1fr)',
                                padding: '8px 12px',
                                background: 'rgba(51,51,51,0.1)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: 'rgba(51,51,51,0.6)',
                                textTransform: 'uppercase'
                            }}>
                                <span>Equipe</span>
                                <span style={{ textAlign: 'center' }}>J</span>
                                <span style={{ textAlign: 'center' }}>V</span>
                                <span style={{ textAlign: 'center' }}>D</span>
                                <span style={{ textAlign: 'center' }}>+/-</span>
                                <span style={{ textAlign: 'center' }}>Pts</span>
                            </div>
                            {/* Rows */}
                            {tournament.standings.map((standing, index) => (
                                <div
                                    key={standing.teamId}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr repeat(5, 1fr)',
                                        padding: '10px 12px',
                                        borderTop: index > 0 ? '1px solid rgba(51,51,51,0.1)' : 'none',
                                        background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : 'transparent'
                                    }}
                                >
                                    <span style={{
                                        fontWeight: 700,
                                        fontSize: '0.875rem',
                                        color: 'var(--color-text-dark)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            background: index === 0 ? '#FFD700' : 'rgba(51,51,51,0.1)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 800
                                        }}>
                                            {index + 1}
                                        </span>
                                        {standing.teamName}
                                    </span>
                                    <span style={{ textAlign: 'center', fontSize: '0.875rem' }}>{standing.played}</span>
                                    <span style={{ textAlign: 'center', fontSize: '0.875rem', color: '#2ECC71', fontWeight: 600 }}>{standing.wins}</span>
                                    <span style={{ textAlign: 'center', fontSize: '0.875rem', color: '#E74C3C', fontWeight: 600 }}>{standing.losses}</span>
                                    <span style={{ textAlign: 'center', fontSize: '0.875rem' }}>{standing.goalsFor - standing.goalsAgainst}</span>
                                    <span style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 800 }}>{standing.points}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bracket View */}
                {tournament.mode === 'bracket' && tournament.bracket && (
                    <div style={{ marginBottom: 'var(--spacing-lg)', overflowX: 'auto' }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            Bracket
                        </h2>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-md)',
                            minWidth: 'fit-content'
                        }}>
                            {tournament.bracket.map((round) => (
                                <div key={round.roundNumber} style={{ minWidth: '200px' }}>
                                    <p style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'rgba(51,51,51,0.6)',
                                        marginBottom: '8px',
                                        textAlign: 'center'
                                    }}>
                                        {round.roundName}
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        {round.matches.map((match) => (
                                            <div
                                                key={match.matchId}
                                                style={{
                                                    background: match.status === 'bye' ? 'rgba(51,51,51,0.05)' : 'var(--color-beige)',
                                                    border: `2px solid ${match.status === 'in_progress' ? '#FFD700' : '#333333'}`,
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '8px',
                                                    opacity: match.status === 'bye' ? 0.5 : 1
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '4px 0',
                                                    borderBottom: '1px solid rgba(51,51,51,0.1)'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: match.winnerId === match.team1.teamId ? 700 : 500,
                                                        color: match.winnerId === match.team1.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                    }}>
                                                        {match.team1.name || 'TBD'}
                                                    </span>
                                                    {match.score && (
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{match.score[0]}</span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '4px 0'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: match.winnerId === match.team2.teamId ? 700 : 500,
                                                        color: match.winnerId === match.team2.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                    }}>
                                                        {match.status === 'bye' ? '-' : (match.team2.name || 'TBD')}
                                                    </span>
                                                    {match.score && (
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{match.score[1]}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Matches List */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h2 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--color-text-dark)',
                        marginBottom: 'var(--spacing-sm)'
                    }}>
                        Matchs
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tournament.matches
                            .filter(m => m.status !== 'bye')
                            .map((match) => (
                                <div
                                    key={match.matchId}
                                    style={{
                                        background: match.status === 'in_progress' ? 'rgba(255, 215, 0, 0.2)' : 'var(--color-beige)',
                                        border: `3px solid ${match.status === 'in_progress' ? '#FFD700' : '#333333'}`,
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--spacing-md)'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: '8px'
                                            }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    color: match.winnerId === match.team1.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                }}>
                                                    {match.team1.name}
                                                </span>
                                                {match.score && (
                                                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{match.score[0]}</span>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    color: match.winnerId === match.team2.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                }}>
                                                    {match.team2.name}
                                                </span>
                                                {match.score && (
                                                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{match.score[1]}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ marginLeft: '12px' }}>
                                            {match.status === 'completed' && (
                                                <CheckCircleIcon className="h-6 w-6" style={{ color: '#2ECC71' }} />
                                            )}
                                            {match.status === 'in_progress' && (
                                                <div style={{
                                                    padding: '4px 8px',
                                                    background: '#FFD700',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    color: '#333333'
                                                }}>
                                                    EN COURS
                                                </div>
                                            )}
                                            {match.status === 'pending' && (
                                                <ClockIcon className="h-6 w-6" style={{ color: 'rgba(51,51,51,0.3)' }} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Host Actions */}
                {isHost && nextMatch && (
                    <button
                        onClick={() => handleStartMatch(nextMatch)}
                        disabled={isStartingMatch}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: 'var(--spacing-md)',
                            background: '#2ECC71',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: isStartingMatch ? 'not-allowed' : 'pointer',
                            opacity: isStartingMatch ? 0.7 : 1
                        }}
                    >
                        <PlayIcon className="h-5 w-5" />
                        {isStartingMatch ? 'Lancement...' : `Lancer: ${nextMatch.team1.name} vs ${nextMatch.team2.name}`}
                    </button>
                )}

                {/* No more matches */}
                {!nextMatch && tournament.status === 'in_progress' && (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-lg)',
                        color: 'rgba(51,51,51,0.6)'
                    }}>
                        <TrophyIcon className="h-12 w-12 mx-auto mb-2" style={{ color: '#FFD700' }} />
                        <p>Tournoi en cours de finalisation...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
