'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    getTournament,
    createTournamentGame
} from '@/lib/firebase/tournaments';
import { Tournament, TournamentTeam } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

function MatchContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const tournamentId = params.id as string;
    const { user, initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState('');

    const matchId = searchParams.get('matchId');
    const team1Data = searchParams.get('team1');
    const team2Data = searchParams.get('team2');

    const team1: TournamentTeam | null = team1Data ? JSON.parse(team1Data) : null;
    const team2: TournamentTeam | null = team2Data ? JSON.parse(team2Data) : null;

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
                setError('Erreur lors du chargement');
            } finally {
                setIsLoading(false);
            }
        };

        if (tournamentId) {
            loadTournament();
        }
    }, [tournamentId]);

    const handleStartGame = async () => {
        if (!tournament || !matchId || !team1 || !team2) return;

        setIsStarting(true);
        setError('');

        try {
            const match = tournament.matches.find(m => m.matchId === matchId);
            if (!match) {
                throw new Error('Match non trouve');
            }

            const gameId = await createTournamentGame(tournament, match);
            router.push(`/game/${gameId}`);
        } catch (err) {
            console.error('Error starting game:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du lancement';
            setError(errorMessage);
            setIsStarting(false);
        }
    };

    const isHost = user?.userId === tournament?.hostId;

    if (isLoading) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    if (!tournament || !team1 || !team2) {
        return (
            <div className={styles.pageContainer}>
                <FieldBackground />
                <div className={styles.contentWrapper}>
                    <div className="error-box">
                        Donnees du match invalides
                    </div>
                    <button
                        onClick={() => router.push(`/tournament/${tournamentId}/live`)}
                        style={{ marginTop: 'var(--spacing-lg)' }}
                    >
                        Retour au tournoi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <button
                        onClick={() => router.push(`/tournament/${tournamentId}/live`)}
                        className={styles.backButton}
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>Match</h1>
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                {/* Match Preview */}
                <div style={{
                    background: 'var(--color-beige)',
                    border: '3px solid #333333',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-xl)',
                    textAlign: 'center',
                    marginBottom: 'var(--spacing-xl)'
                }}>
                    {/* Team 1 */}
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(to bottom right, #E74C3C, #C0392B)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--spacing-sm)',
                            border: '3px solid #333333'
                        }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                {team1.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <p style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'var(--color-text-dark)',
                            marginBottom: '4px'
                        }}>
                            {team1.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)' }}>
                            {team1.players.map(p => p.username).join(' & ')}
                        </p>
                    </div>

                    {/* VS */}
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#FFD700',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        VS
                    </div>

                    {/* Team 2 */}
                    <div>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(to bottom right, #3498DB, #2980B9)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--spacing-sm)',
                            border: '3px solid #333333'
                        }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                {team2.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <p style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'var(--color-text-dark)',
                            marginBottom: '4px'
                        }}>
                            {team2.name}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.6)' }}>
                            {team2.players.map(p => p.username).join(' & ')}
                        </p>
                    </div>
                </div>

                {/* Match Info */}
                <div style={{
                    background: '#FFD700',
                    border: '3px solid #333333',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xl)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333333' }}>
                        Premier a {tournament.targetScore} buts
                    </p>
                    {tournament.venueName !== 'Aucun' && (
                        <p style={{ fontSize: '0.75rem', color: 'rgba(51,51,51,0.7)', marginTop: '4px' }}>
                            {tournament.venueName}
                        </p>
                    )}
                </div>

                {/* Start Button - Host only */}
                {isHost && (
                    <button
                        onClick={handleStartGame}
                        disabled={isStarting}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            background: '#2ECC71',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            cursor: isStarting ? 'not-allowed' : 'pointer',
                            opacity: isStarting ? 0.7 : 1
                        }}
                    >
                        <PlayIcon className="h-6 w-6" />
                        {isStarting ? 'Lancement...' : 'Lancer le match'}
                    </button>
                )}

                {/* Non-host message */}
                {!isHost && (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-lg)',
                        color: 'rgba(51,51,51,0.6)'
                    }}>
                        En attente que l'organisateur lance le match...
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="container-center">
            <div className={styles.spinner} />
        </div>
    );
}

export default function TournamentMatchPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <MatchContent />
        </Suspense>
    );
}
