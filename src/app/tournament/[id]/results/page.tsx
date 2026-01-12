'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getTournament } from '@/lib/firebase/tournaments';
import { Tournament } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    TrophyIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

export default function TournamentResultsPage() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;
    const { initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        const loadTournament = async () => {
            try {
                const t = await getTournament(tournamentId);
                setTournament(t);
            } catch (err) {
                console.error('Error loading tournament:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (tournamentId) {
            loadTournament();
        }
    }, [tournamentId]);

    if (isLoading || !tournament) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    // Determine winner
    let winner = null;
    let finalStandings = tournament.standings || [];

    if (tournament.mode === 'round_robin' && tournament.standings && tournament.standings.length > 0) {
        winner = tournament.standings[0];
    } else if (tournament.mode === 'bracket' && tournament.bracket) {
        const finalRound = tournament.bracket[tournament.bracket.length - 1];
        if (finalRound && finalRound.matches.length > 0) {
            const finalMatch = finalRound.matches[0];
            if (finalMatch.winnerId) {
                const winnerTeam = tournament.teams.find(t => t.teamId === finalMatch.winnerId);
                if (winnerTeam) {
                    winner = {
                        teamId: winnerTeam.teamId,
                        teamName: winnerTeam.name,
                        players: winnerTeam.players,
                        played: 0,
                        wins: 0,
                        losses: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        points: 0
                    };
                }
            }
        }
    }

    // Calculate stats
    const totalMatches = tournament.matches.filter(m => m.status === 'completed').length;
    const totalGoals = tournament.matches.reduce((sum, m) => {
        if (m.score) return sum + m.score[0] + m.score[1];
        return sum;
    }, 0);

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Winner Celebration */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 'var(--spacing-xl)',
                    paddingTop: 'var(--spacing-lg)'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'linear-gradient(to bottom right, #FFD700, #FFA500)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--spacing-md)',
                        border: '4px solid #333333',
                        boxShadow: '0 8px 0 rgba(0,0,0,0.2)'
                    }}>
                        <TrophyIcon className="h-12 w-12" style={{ color: '#333333' }} />
                    </div>

                    <h1 style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-text-dark)',
                        marginBottom: '4px'
                    }}>
                        TOURNOI TERMINE
                    </h1>

                    {winner && (
                        <div style={{
                            background: '#FFD700',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            marginTop: 'var(--spacing-lg)'
                        }}>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'rgba(51,51,51,0.7)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                fontWeight: 600
                            }}>
                                Vainqueur
                            </p>
                            <p style={{
                                fontSize: '1.75rem',
                                fontWeight: 800,
                                color: '#333333',
                                marginBottom: '8px'
                            }}>
                                {winner.teamName}
                            </p>
                            <p style={{
                                fontSize: '0.875rem',
                                color: 'rgba(51,51,51,0.7)'
                            }}>
                                {winner.players.map(p => p.username).join(' & ')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Tournament Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <div style={{
                        background: 'var(--color-beige)',
                        border: '3px solid #333333',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>
                            {totalMatches}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)', fontWeight: 600 }}>
                            MATCHS
                        </p>
                    </div>
                    <div style={{
                        background: 'var(--color-beige)',
                        border: '3px solid #333333',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>
                            {totalGoals}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)', fontWeight: 600 }}>
                            BUTS
                        </p>
                    </div>
                </div>

                {/* Final Standings (Round Robin) */}
                {tournament.mode === 'round_robin' && finalStandings.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            Classement final
                        </h2>
                        <div style={{
                            background: 'var(--color-beige)',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden'
                        }}>
                            {finalStandings.map((standing, index) => (
                                <div
                                    key={standing.teamId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderTop: index > 0 ? '1px solid rgba(51,51,51,0.1)' : 'none',
                                        background: index === 0 ? 'rgba(255, 215, 0, 0.3)' : 'transparent'
                                    }}
                                >
                                    <span style={{
                                        width: '28px',
                                        height: '28px',
                                        background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(51,51,51,0.1)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 800,
                                        color: index < 3 ? '#333333' : 'rgba(51,51,51,0.5)'
                                    }}>
                                        {index + 1}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-dark)' }}>
                                            {standing.teamName}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: 'rgba(51,51,51,0.5)' }}>
                                            {standing.wins}V - {standing.losses}D | {standing.goalsFor} buts
                                        </p>
                                    </div>
                                    <span style={{
                                        fontSize: '1rem',
                                        fontWeight: 800,
                                        color: 'var(--color-text-dark)'
                                    }}>
                                        {standing.points} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bracket View (Bracket mode) */}
                {tournament.mode === 'bracket' && tournament.bracket && (
                    <div style={{ marginBottom: 'var(--spacing-lg)', overflowX: 'auto' }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--color-text-dark)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            Bracket final
                        </h2>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-md)',
                            minWidth: 'fit-content'
                        }}>
                            {tournament.bracket.map((round) => (
                                <div key={round.roundNumber} style={{ minWidth: '180px' }}>
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
                                                    border: '2px solid #333333',
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
                                                        fontSize: '0.7rem',
                                                        fontWeight: match.winnerId === match.team1.teamId ? 700 : 500,
                                                        color: match.winnerId === match.team1.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                    }}>
                                                        {match.team1.name || 'TBD'}
                                                    </span>
                                                    {match.score && (
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{match.score[0]}</span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '4px 0'
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: match.winnerId === match.team2.teamId ? 700 : 500,
                                                        color: match.winnerId === match.team2.teamId ? '#2ECC71' : 'var(--color-text-dark)'
                                                    }}>
                                                        {match.status === 'bye' ? '-' : (match.team2.name || 'TBD')}
                                                    </span>
                                                    {match.score && (
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{match.score[1]}</span>
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

                {/* Back to Dashboard */}
                <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        background: 'var(--color-green-medium)',
                        border: '3px solid #333333',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    <HomeIcon className="h-5 w-5" />
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    );
}
