'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/common/ui';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import PlayerList from '@/components/game/PlayerList';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenues } from '@/lib/firebase/firestore';
import { createGameSession, subscribeToSession, cancelSession, startGame } from '@/lib/firebase/game-sessions';
import TeamSetup from '@/components/game/TeamSetup';
import { Venue, GameFormat, GameSession, Player, Team } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    UserIcon,
    UsersIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

type Step = 'config' | 'waiting' | 'teams';

export default function NewGamePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [step, setStep] = useState<Step>('config');
    const [format, setFormat] = useState<GameFormat>('1v1');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [targetScore, setTargetScore] = useState<6 | 11>(6);
    const [venues, setVenues] = useState<Venue[]>([]);
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
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        loadVenues();
    }, []);

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

    const loadVenues = async () => {
        try {
            const data = await getVenues({ limit: 20 });
            setVenues(data);
            if (data.length > 0) {
                setSelectedVenue(data[0]);
            }
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const handleCreateSession = async () => {
        console.log('handleCreateSession called', { user, selectedVenue });
        if (!selectedVenue || !user) {
            console.error('Missing user or venue');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log('Creating session...');
            const newSession = await createGameSession(
                user.userId,
                user.username,
                selectedVenue.venueId,
                selectedVenue.name,
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
        if (!session) return;

        try {
            // Convert complex Team objects to simplified structure expected by startGame if needed
            // But startGame expects { team1: Player[], team2: Player[] } currently
            // We need to update startGame or adapt the data here.
            // Actually, the new GameState uses [Team, Team].
            // Let's check startGame signature in game-sessions.ts first.
            // Assuming we need to update startGame to accept the new Team structure.
            // For now, I'll pass the teams as is, assuming I will update game-sessions.ts next.

            const game = await startGame(session.sessionId, teams, targetScore);
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
                    <div className="error-box">
                        {error}
                    </div>
                )}

                {/* Step 1: Configuration */}
                {step === 'config' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        {/* Format Selection */}
                        <div>
                            <label className="input-label" style={{ marginBottom: 'var(--spacing-md)' }}>
                                Format de jeu
                            </label>
                            <div className="grid-2">
                                <button
                                    onClick={() => setFormat('1v1')}
                                    className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                >
                                    <UserIcon className={`h-8 w-8 mx-auto mb-2 ${format === '1v1' ? 'text-[var(--color-field-green)]' : 'text-[var(--color-text-secondary)]'}`} />
                                    <p className={`font-semibold ${format === '1v1' ? 'text-[var(--color-field-green)]' : 'text-white'}`}>1 vs 1</p>
                                </button>
                                <button
                                    onClick={() => setFormat('2v2')}
                                    className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                >
                                    <UsersIcon className={`h-8 w-8 mx-auto mb-2 ${format === '2v2' ? 'text-[var(--color-field-green)]' : 'text-[var(--color-text-secondary)]'}`} />
                                    <p className={`font-semibold ${format === '2v2' ? 'text-[var(--color-field-green)]' : 'text-white'}`}>2 vs 2</p>
                                </button>
                            </div>
                        </div>

                        {/* Target Score */}
                        <div>
                            <label className="input-label" style={{ marginBottom: 'var(--spacing-md)' }}>
                                Score de victoire
                            </label>
                            <div className="grid-2">
                                {([6, 11] as const).map((score) => (
                                    <button
                                        key={score}
                                        onClick={() => setTargetScore(score)}
                                        className={`${styles.selectionCard} ${targetScore === score ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                    >
                                        <p className={`text-2xl font-bold ${targetScore === score ? 'text-[var(--color-field-green)]' : 'text-white'}`}>{score}</p>
                                        <p className="text-secondary text-sm">buts</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Venue Selection */}
                        <div>
                            <label className="input-label" style={{ marginBottom: 'var(--spacing-md)' }}>
                                Lieu
                            </label>
                            {venues.length === 0 ? (
                                <div className={styles.emptyState} style={{ padding: 'var(--spacing-xl)', background: 'var(--color-pitch-medium)', borderRadius: 'var(--radius-md)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                                    <MapPinIcon className={styles.emptyIcon} />
                                    <p className={styles.emptyText}>Aucun lieu enregistré</p>
                                    <Link href="/venues/add">
                                        <Button variant="ghost" size="sm">Ajouter un lieu</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: '12rem', overflowY: 'auto' }}>
                                    {venues.map((venue) => (
                                        <button
                                            key={venue.venueId}
                                            onClick={() => setSelectedVenue(venue)}
                                            className={`${styles.selectionCard} ${selectedVenue?.venueId === venue.venueId ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', textAlign: 'left' }}
                                        >
                                            <MapPinIcon className={`h-5 w-5 ${selectedVenue?.venueId === venue.venueId ? 'text-[var(--color-field-green)]' : 'text-[var(--color-text-secondary)]'}`} />
                                            <span className={selectedVenue?.venueId === venue.venueId ? 'text-[var(--color-field-green)]' : 'text-white'}>
                                                {venue.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Create Button */}
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={handleCreateSession}
                                disabled={!selectedVenue || isLoading}
                                style={{ width: '100%' }}
                            >
                                <div className="btn-primary">
                                    <div className="btn-primary-shadow" />
                                    <div className="btn-primary-content">
                                        {isLoading ? 'Création...' : 'Générer le code'}
                                    </div>
                                </div>
                            </button>

                            {/* Test Button */}
                            <button
                                onClick={async () => {
                                    if (!user) return;
                                    setIsLoading(true);
                                    try {
                                        // Use selected venue or first available
                                        const venue = selectedVenue || venues[0];
                                        if (!venue) {
                                            setError('Aucun lieu disponible');
                                            setIsLoading(false);
                                            return;
                                        }

                                        // Create a temporary session
                                        const session = await createGameSession(
                                            user.userId,
                                            user.username,
                                            venue.venueId,
                                            venue.name,
                                            '1v1'
                                        );

                                        // Start game immediately with user in both teams
                                        const testPlayer: Player = {
                                            userId: user.userId,
                                            username: user.username,
                                            avatarUrl: user.avatarUrl || null
                                        };

                                        const teams: [Team, Team] = [
                                            { players: [testPlayer], color: 'blue', score: 0 },
                                            { players: [testPlayer], color: 'red', score: 0 }
                                        ];

                                        const game = await startGame(session.sessionId, teams, targetScore);
                                        router.push(`/game/${game.gameId}`);
                                    } catch (err) {
                                        console.error('Test mode error:', err);
                                        setError('Erreur mode test');
                                        setIsLoading(false);
                                    }
                                }}
                                disabled={isLoading}
                                className="w-full opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <div className="btn-secondary">
                                    <div className="btn-secondary-shadow" />
                                    <div className="btn-secondary-content text-xs">
                                        🧪 Mode Test (Solo)
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Waiting for Players */}
                {step === 'waiting' && session && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
                        {/* QR Code */}
                        <QRCodeDisplay
                            qrData={session.qrCodeData}
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

                        {/* Player List */}
                        <PlayerList
                            players={session.players}
                            maxPlayers={session.maxPlayers}
                            currentUserId={user?.userId}
                        />

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <button onClick={handleCancel} style={{ width: '100%' }}>
                                <div className="btn-secondary">
                                    <div className="btn-secondary-shadow" />
                                    <div className="btn-secondary-content" style={{ color: 'var(--color-accent-orange)' }}>
                                        Annuler
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
            </div>
        </div>
    );
}
