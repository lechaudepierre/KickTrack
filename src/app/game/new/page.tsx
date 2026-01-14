'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/common/ui';
import PinCodeDisplay from '@/components/game/PinCodeDisplay';
import PlayerList from '@/components/game/PlayerList';
import { useAuthStore } from '@/lib/stores/authStore';
import { createGameSession, subscribeToSession, cancelSession, startGame } from '@/lib/firebase/game-sessions';
import TeamSetup from '@/components/game/TeamSetup';
import VenueDropdown from '@/components/venues/VenueDropdown';
import { Venue, GameFormat, GameSession, Player, Team } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    UserIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

type Step = 'config' | 'waiting' | 'teams' | 'guest-teams';

export default function NewGamePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [step, setStep] = useState<Step>('config');
    const [format, setFormat] = useState<GameFormat>('1v1');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [targetScore, setTargetScore] = useState<6 | 11>(6);
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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

    // Subscribe to session updates
    useEffect(() => {
        if (!session) return;

        const unsubscribe = subscribeToSession(session.sessionId, (updatedSession) => {
            if (updatedSession) {
                setSession(updatedSession);
                // Auto-advance when all players have joined
                if (updatedSession.status === 'ready') {
                    setStep('teams');
                }
            }
        });

        return () => unsubscribe();
    }, [session?.sessionId]);

    const handleCreateSession = async () => {
        console.log('handleCreateSession called', { user, selectedVenue });
        if (!user) {
            console.error('Missing user');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log('Creating session...');
            const newSession = await createGameSession(
                user.userId,
                user.username,
                selectedVenue?.venueId || 'none',
                selectedVenue?.name || 'Aucun',
                format
            );
            console.log('Session created:', newSession);
            setSession(newSession);
            setStep('waiting');
        } catch (err: unknown) {
            console.error('Error creating session:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        if (session) {
            await cancelSession(session.sessionId);
        }
        setSession(null);
        setStep('config');
    };

    const handleStartGame = async (teams: [Team, Team]) => {
        // For guest mode, we might not have a session yet
        let sessionId = session?.sessionId;

        if (!sessionId && user) {
            try {
                const newSession = await createGameSession(
                    user.userId,
                    user.username,
                    selectedVenue?.venueId || 'none',
                    selectedVenue?.name || 'Aucun',
                    format
                );
                sessionId = newSession.sessionId;
            } catch (err) {
                console.error('Error creating guest session:', err);
                setError('Erreur lors de la création de la session');
                return;
            }
        }

        if (!sessionId) return;

        try {
            const game = await startGame(sessionId, teams, targetScore);
            router.push(`/game/${game.gameId}`);
        } catch (err) {
            console.error('Error starting game:', err);
            setError('Erreur lors du lancement de la partie');
        }
    };

    const handleExpired = () => {
        setError('Le code a expiré. Veuillez en générer un nouveau.');
        setSession(null);
        setStep('config');
    };

    const handleGuestMode = () => {
        if (!user) return;
        setStep('guest-teams');
    };

    if (authLoading) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
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
                        onClick={() => step === 'config' ? router.back() : handleCancel()}
                        className={styles.backButton}
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>
                        {step === 'config' ? 'Nouvelle Partie' :
                            step === 'waiting' ? 'En attente...' :
                                'Équipes'}
                    </h1>
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                {/* Step 1: Configuration */}
                {step === 'config' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Venue Selection */}
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                Stade
                            </label>
                            <VenueDropdown
                                selectedVenue={selectedVenue}
                                onSelectVenue={setSelectedVenue}
                                showNoneOption={true}
                            />
                        </div>

                        {/* Format Selection */}
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                Format de jeu
                            </label>
                            <div className={styles.grid2}>
                                <button
                                    onClick={() => setFormat('1v1')}
                                    className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                >
                                    <UserIcon className="h-8 w-8 mx-auto mb-2" style={{ color: format === '1v1' ? 'white' : 'var(--color-text-dark)' }} />
                                    <p style={{ fontWeight: 600, color: format === '1v1' ? 'white' : 'var(--color-text-dark)' }}>1 vs 1</p>
                                </button>
                                <button
                                    onClick={() => setFormat('2v2')}
                                    className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                >
                                    <UsersIcon className="h-8 w-8 mx-auto mb-2" style={{ color: format === '2v2' ? 'white' : 'var(--color-text-dark)' }} />
                                    <p style={{ fontWeight: 600, color: format === '2v2' ? 'white' : 'var(--color-text-dark)' }}>2 vs 2</p>
                                </button>
                            </div>
                        </div>

                        {/* Target Score */}
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                Score de victoire
                            </label>
                            <div className={styles.grid2}>
                                {([6, 11] as const).map((score) => (
                                    <button
                                        key={score}
                                        onClick={() => setTargetScore(score)}
                                        className={`${styles.selectionCard} ${targetScore === score ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                    >
                                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: targetScore === score ? 'white' : 'var(--color-text-dark)' }}>{score}</p>
                                        <p style={{ fontSize: '0.75rem', color: targetScore === score ? 'rgba(255,255,255,0.8)' : 'rgba(51,51,51,0.6)' }}>buts</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <button
                                onClick={handleCreateSession}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-md) var(--spacing-lg)',
                                    background: 'var(--color-beige)',
                                    border: '3px solid #333333',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--color-text-dark)',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    opacity: isLoading ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 6px 0 rgba(0, 0, 0, 0.3)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {isLoading ? 'Création...' : 'Générer le code'}
                            </button>

                            {/* Guest Mode Button */}
                            <button
                                onClick={handleGuestMode}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-md) var(--spacing-lg)',
                                    background: 'var(--color-green-medium)',
                                    border: '3px solid #333333',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    opacity: isLoading ? 0.5 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isLoading) {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 6px 0 rgba(0, 0, 0, 0.3)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                Mode Invité
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Waiting for Players */}
                {step === 'waiting' && session && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
                        {/* PIN Code Display */}
                        <div style={{
                            backgroundColor: 'var(--color-beige)',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-xl)',
                            boxShadow: '0 8px 0 rgba(0, 0, 0, 0.1)'
                        }}>
                            <PinCodeDisplay
                                pinCode={session.pinCode}
                                createdAt={
                                    session.createdAt && typeof (session.createdAt as any).toDate === 'function'
                                        ? (session.createdAt as any).toDate()
                                        : session.createdAt instanceof Date
                                            ? session.createdAt
                                            : new Date(session.createdAt)
                                }
                                onExpired={handleExpired}
                            />
                        </div>

                        {/* Player List */}
                        <PlayerList
                            players={session.players}
                            maxPlayers={session.maxPlayers}
                            currentUserId={user?.userId}
                        />

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <button onClick={handleCancel} style={{ width: '100%', border: 'none', background: 'none', padding: 0 }}>
                                <div className="btn-primary">
                                    <div className="btn-primary-shadow" />
                                    <div className="btn-primary-content" style={{ color: 'var(--color-error)' }}>
                                        Annuler la partie
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Team Setup */}
                {step === 'teams' && session && (
                    <TeamSetup
                        players={session.players}
                        format={format}
                        onStartGame={handleStartGame}
                    />
                )}

                {/* Step 4: Guest Mode Team Setup */}
                {step === 'guest-teams' && user && (
                    <TeamSetup
                        players={[
                            {
                                userId: user.userId,
                                username: user.username,
                                avatarUrl: user.avatarUrl || null
                            },
                            ...(format === '1v1'
                                ? [
                                    {
                                        userId: `guest_${user.userId}_1`,
                                        username: 'Invité 1',
                                        avatarUrl: null
                                    }
                                ]
                                : [
                                    {
                                        userId: `guest_${user.userId}_1`,
                                        username: 'Invité 1',
                                        avatarUrl: null
                                    },
                                    {
                                        userId: `guest_${user.userId}_2`,
                                        username: 'Invité 2',
                                        avatarUrl: null
                                    },
                                    {
                                        userId: `guest_${user.userId}_3`,
                                        username: 'Invité 3',
                                        avatarUrl: null
                                    }
                                ]
                            )
                        ]}
                        format={format}
                        onStartGame={handleStartGame}
                    />
                )}
            </div>
        </div>
    );
}
