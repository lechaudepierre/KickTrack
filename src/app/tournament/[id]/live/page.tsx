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
                                        gap: '8px',
                                        minWidth: 0
                                    }}>
                                        <span style={{
                                            width: '20px',
                                            height: '20px',
                                            flexShrink: 0,
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
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {standing.teamName}
                                        </span>
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
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-md)',
                            textAlign: 'center'
                        }}>
                            Bracket
                        </h2>
                        <div style={{
                            overflowX: 'auto',
                            paddingBottom: 'var(--spacing-md)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                minWidth: 'fit-content',
                                justifyContent: 'center',
                                padding: '0 var(--spacing-sm)'
                            }}>
                                {tournament.bracket.map((round, roundIdx) => {
                                    // Calculate height for proper vertical alignment
                                    const matchHeight = 52; // Height of one match card
                                    const baseGap = 8;
                                    const totalMatchHeight = matchHeight + baseGap;

                                    return (
                                        <div key={round.roundNumber} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center'
                                        }}>
                                            {/* Round title */}
                                            <p style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                color: 'rgba(51,51,51,0.5)',
                                                marginBottom: '12px',
                                                textAlign: 'center',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {round.roundName}
                                            </p>

                                            {/* Matches container */}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-around',
                                                height: `${tournament.bracket![0].matches.length * totalMatchHeight}px`,
                                                gap: roundIdx === 0 ? `${baseGap}px` : '0'
                                            }}>
                                                {round.matches.map((match) => {
                                                    const isBye = match.status === 'bye';
                                                    const isInProgress = match.status === 'in_progress';
                                                    const isCompleted = match.status === 'completed';
                                                    const isReady = match.status === 'pending' && match.team1.teamId && match.team2.teamId;

                                                    return (
                                                        <div
                                                            key={match.matchId}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            {/* Connector line from previous round */}
                                                            {roundIdx > 0 && (
                                                                <div style={{
                                                                    width: '12px',
                                                                    height: '2px',
                                                                    background: '#333333',
                                                                    opacity: 0.3
                                                                }} />
                                                            )}

                                                            {/* Match card */}
                                                            <div style={{
                                                                width: '120px',
                                                                background: isBye
                                                                    ? 'rgba(51,51,51,0.03)'
                                                                    : isInProgress
                                                                        ? 'rgba(255, 215, 0, 0.15)'
                                                                        : isCompleted
                                                                            ? 'var(--color-beige)'
                                                                            : 'white',
                                                                border: `2px solid ${isInProgress ? '#FFD700' : isReady ? '#2ECC71' : '#333333'}`,
                                                                borderRadius: '6px',
                                                                overflow: 'hidden',
                                                                opacity: isBye ? 0.4 : 1,
                                                                boxShadow: isInProgress ? '0 0 8px rgba(255, 215, 0, 0.3)' : 'none'
                                                            }}>
                                                                {/* Team 1 */}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '5px 8px',
                                                                    borderBottom: '1px solid rgba(51,51,51,0.1)',
                                                                    background: match.winnerId === match.team1.teamId
                                                                        ? 'rgba(46, 204, 113, 0.15)'
                                                                        : 'transparent'
                                                                }}>
                                                                    <span style={{
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: match.winnerId === match.team1.teamId ? 700 : 500,
                                                                        color: match.winnerId === match.team1.teamId
                                                                            ? '#27AE60'
                                                                            : match.team1.teamId
                                                                                ? 'var(--color-text-dark)'
                                                                                : 'rgba(51,51,51,0.3)',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        flex: 1
                                                                    }}>
                                                                        {match.team1.name || 'TBD'}
                                                                    </span>
                                                                    {match.score && (
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            marginLeft: '4px',
                                                                            color: match.winnerId === match.team1.teamId ? '#27AE60' : '#333'
                                                                        }}>
                                                                            {match.score[0]}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Team 2 */}
                                                                <div style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '5px 8px',
                                                                    background: match.winnerId === match.team2.teamId
                                                                        ? 'rgba(46, 204, 113, 0.15)'
                                                                        : 'transparent'
                                                                }}>
                                                                    <span style={{
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: match.winnerId === match.team2.teamId ? 700 : 500,
                                                                        color: match.winnerId === match.team2.teamId
                                                                            ? '#27AE60'
                                                                            : (isBye || !match.team2.teamId)
                                                                                ? 'rgba(51,51,51,0.3)'
                                                                                : 'var(--color-text-dark)',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        flex: 1
                                                                    }}>
                                                                        {isBye ? '-' : (match.team2.name || 'TBD')}
                                                                    </span>
                                                                    {match.score && (
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            marginLeft: '4px',
                                                                            color: match.winnerId === match.team2.teamId ? '#27AE60' : '#333'
                                                                        }}>
                                                                            {match.score[1]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Connector line to next round */}
                                                            {roundIdx < tournament.bracket!.length - 1 && (
                                                                <div style={{
                                                                    width: '12px',
                                                                    height: '2px',
                                                                    background: '#333333',
                                                                    opacity: 0.3
                                                                }} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: '8px',
                                                gap: '8px'
                                            }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    color: match.winnerId === match.team1.teamId ? '#2ECC71' : 'var(--color-text-dark)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    minWidth: 0
                                                }}>
                                                    {match.team1.name}
                                                </span>
                                                {match.score && (
                                                    <span style={{ fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{match.score[0]}</span>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem',
                                                    color: match.winnerId === match.team2.teamId ? '#2ECC71' : 'var(--color-text-dark)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1,
                                                    minWidth: 0
                                                }}>
                                                    {match.team2.name}
                                                </span>
                                                {match.score && (
                                                    <span style={{ fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{match.score[1]}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0 }}>
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
                                                    color: '#333333',
                                                    whiteSpace: 'nowrap'
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
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: 'var(--spacing-md)',
                            background: '#2ECC71',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 700,
                            cursor: isStartingMatch ? 'not-allowed' : 'pointer',
                            opacity: isStartingMatch ? 0.7 : 1
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PlayIcon className="h-5 w-5" />
                            <span style={{ fontSize: '1rem' }}>
                                {isStartingMatch ? 'Lancement...' : 'Lancer le match'}
                            </span>
                        </div>
                        {!isStartingMatch && (
                            <span style={{
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                padding: '0 var(--spacing-sm)'
                            }}>
                                {nextMatch.team1.name} vs {nextMatch.team2.name}
                            </span>
                        )}
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
