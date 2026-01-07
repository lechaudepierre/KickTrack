'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import QRCodeDisplay from '@/components/game/QRCodeDisplay';
import PlayerList from '@/components/game/PlayerList';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenues } from '@/lib/firebase/firestore';
import { createGameSession, subscribeToSession, cancelSession, startGame } from '@/lib/firebase/game-sessions';
import { Venue, GameFormat, GameSession, Player } from '@/types';
import {
    ArrowLeftIcon,
    UserIcon,
    UsersIcon,
    MapPinIcon
} from '@heroicons/react/24/outline';

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
                if (updatedSession.status === 'ready' && format === '1v1') {
                    // For 1v1, skip team selection and start game directly
                    handleStartGame(updatedSession.players);
                } else if (updatedSession.status === 'ready') {
                    setStep('teams');
                }
            }
        });

        return () => unsubscribe();
    }, [session?.sessionId, format]);

    const loadVenues = async () => {
        try {
            const data = await getVenues({ limit: 20 });
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const handleCreateSession = async () => {
        if (!selectedVenue || !user) return;

        setIsLoading(true);
        setError('');

        try {
            const newSession = await createGameSession(
                user.userId,
                user.username,
                selectedVenue.venueId,
                selectedVenue.name,
                format
            );
            setSession(newSession);
            setStep('waiting');
        } catch (err: unknown) {
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

    const handleStartGame = async (players: Player[]) => {
        if (!session) return;

        // For 1v1: simple team assignment
        const teams = {
            team1: [players[0]],
            team2: [players[1]]
        };

        try {
            const game = await startGame(session.sessionId, teams, targetScore);
            router.push(`/game/${game.gameId}`);
        } catch (err) {
            console.error('Error starting game:', err);
        }
    };

    const handleExpired = () => {
        setError('Le code a expiré. Veuillez en générer un nouveau.');
        setSession(null);
        setStep('config');
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="p-6 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => step === 'config' ? router.back() : handleCancel()}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">
                        {step === 'config' ? 'Nouvelle Partie' : 'En attente...'}
                    </h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                {/* Step 1: Configuration */}
                {step === 'config' && (
                    <div className="space-y-6">
                        {/* Format Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                Format de jeu
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setFormat('1v1')}
                                    className={`p-4 rounded-xl border transition-all ${format === '1v1'
                                        ? 'bg-emerald-500/20 border-emerald-500'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <UserIcon className={`h-8 w-8 mx-auto mb-2 ${format === '1v1' ? 'text-emerald-400' : 'text-slate-400'
                                        }`} />
                                    <p className={`font-semibold ${format === '1v1' ? 'text-emerald-400' : 'text-white'
                                        }`}>1 vs 1</p>
                                </button>
                                <button
                                    onClick={() => setFormat('2v2')}
                                    className={`p-4 rounded-xl border transition-all ${format === '2v2'
                                        ? 'bg-emerald-500/20 border-emerald-500'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <UsersIcon className={`h-8 w-8 mx-auto mb-2 ${format === '2v2' ? 'text-emerald-400' : 'text-slate-400'
                                        }`} />
                                    <p className={`font-semibold ${format === '2v2' ? 'text-emerald-400' : 'text-white'
                                        }`}>2 vs 2</p>
                                </button>
                            </div>
                        </div>

                        {/* Target Score */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                Score de victoire
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {([6, 11] as const).map((score) => (
                                    <button
                                        key={score}
                                        onClick={() => setTargetScore(score)}
                                        className={`p-4 rounded-xl border transition-all ${targetScore === score
                                            ? 'bg-emerald-500/20 border-emerald-500'
                                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <p className={`text-2xl font-bold ${targetScore === score ? 'text-emerald-400' : 'text-white'
                                            }`}>{score}</p>
                                        <p className="text-sm text-slate-400">buts</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Venue Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-3">
                                Lieu
                            </label>
                            {venues.length === 0 ? (
                                <div className="p-4 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl text-center">
                                    <MapPinIcon className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-400 text-sm mb-2">Aucun lieu enregistré</p>
                                    <Link href="/venues/add">
                                        <Button variant="ghost" size="sm">Ajouter un lieu</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {venues.map((venue) => (
                                        <button
                                            key={venue.venueId}
                                            onClick={() => setSelectedVenue(venue)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedVenue?.venueId === venue.venueId
                                                ? 'bg-emerald-500/20 border-emerald-500'
                                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <MapPinIcon className={`h-5 w-5 ${selectedVenue?.venueId === venue.venueId
                                                ? 'text-emerald-400'
                                                : 'text-slate-400'
                                                }`} />
                                            <span className={
                                                selectedVenue?.venueId === venue.venueId
                                                    ? 'text-emerald-400'
                                                    : 'text-white'
                                            }>{venue.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Create Button */}
                        <Button
                            fullWidth
                            onClick={handleCreateSession}
                            isLoading={isLoading}
                            disabled={!selectedVenue}
                        >
                            Générer le code
                        </Button>
                    </div>
                )}

                {/* Step 2: Waiting for Players */}
                {step === 'waiting' && session && (
                    <div className="space-y-8">
                        {/* QR Code */}
                        <QRCodeDisplay
                            qrData={session.qrCodeData}
                            pinCode={session.pinCode}
                            createdAt={session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt)}
                            onExpired={handleExpired}
                        />

                        {/* Player List */}
                        <PlayerList
                            players={session.players}
                            maxPlayers={session.maxPlayers}
                            currentUserId={user?.userId}
                        />

                        {/* Actions */}
                        <div className="space-y-3">
                            {session.status === 'ready' && (
                                <Button
                                    fullWidth
                                    onClick={() => handleStartGame(session.players)}
                                >
                                    Commencer la partie
                                </Button>
                            )}
                            <Button variant="danger" fullWidth onClick={handleCancel}>
                                Annuler
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
