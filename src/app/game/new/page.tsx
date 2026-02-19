'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { createGameSession, subscribeToSession, cancelSession, startGame } from '@/lib/firebase/game-sessions';
import TeamSetup from '@/components/game/TeamSetup';
import VenueDropdown from '@/components/venues/VenueDropdown';
import PinCodeDisplay from '@/components/game/PinCodeDisplay';
import PlayerList from '@/components/game/PlayerList';
import { Venue, GameFormat, GameSession, Team } from '@/types';
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
        if (!user) return;

        setIsLoading(true);
        setError('');

        try {
            const newSession = await createGameSession(
                user.userId,
                user.username,
                selectedVenue?.venueId || 'none',
                selectedVenue?.name || 'Aucun',
                format
            );
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
            const game = await startGame(sessionId, teams);
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
                                    className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : `${styles.selectionCardInactive} opacity-60`}`}
                                >
                                    <UserIcon className="h-8 w-8 mx-auto mb-2" />
                                    <p style={{ fontWeight: 600 }}>1 vs 1</p>
                                </button>
                                <button
                                    onClick={() => setFormat('2v2')}
                                    className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : `${styles.selectionCardInactive} opacity-60`}`}
                                >
                                    <UsersIcon className="h-8 w-8 mx-auto mb-2" />
                                    <p style={{ fontWeight: 600 }}>2 vs 2</p>
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--spacing-lg)' }}>
                            <button
                                onClick={handleCreateSession}
                                disabled={isLoading}
                                className={styles.mainButton}
                            >
                                {isLoading ? 'Création...' : 'Générer le code'}
                            </button>

                            <button
                                onClick={handleGuestMode}
                                disabled={isLoading}
                                className={styles.secondaryTextButton}
                            >
                                Mode Invité
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Waiting for Players */}
                {step === 'waiting' && session && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
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

                        <PlayerList
                            players={session.players}
                            maxPlayers={session.maxPlayers}
                            currentUserId={user?.userId}
                        />

                        <button onClick={handleCancel} style={{ width: '100%', border: 'none', background: 'none', padding: 0 }}>
                            <div className="btn-primary">
                                <div className="btn-primary-shadow" />
                                <div className="btn-primary-content" style={{ color: 'var(--color-error)' }}>
                                    Annuler la partie
                                </div>
                            </div>
                        </button>
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
