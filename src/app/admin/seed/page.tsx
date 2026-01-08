'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';
import { recalculateVenueStats } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Opponent users for head-to-head
const OPPONENTS = [
    { odentId: 'opponent-maxfoot-123', odentName: 'MaxFoot' },
    { odentId: 'opponent-lucasbaby-456', odentName: 'LucasBaby' },
    { odentId: 'opponent-thomaskicker-789', odentName: 'ThomasKicker' },
    { odentId: 'opponent-juliegoal-012', odentName: 'JulieGoal' },
];

// Venues
const VENUES = [
    { venueId: 'venue-bar-comptoir', name: 'Le Comptoir' },
    { venueId: 'venue-bar-marcel', name: 'Chez Marcel' },
    { venueId: 'venue-home-test', name: 'Maison' },
];

function generateTestGames(userId: string, username: string, timestamp: number) {
    const games = [];
    const now = timestamp;

    // Game 1: Victory 6-0 (Perfect game inflicted)
    games.push({
        gameId: `test-game-${now}-1`,
        venueId: VENUES[0].venueId,
        venueName: VENUES[0].name,
        gameType: '6',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 6
            },
            {
                players: [{ userId: OPPONENTS[0].odentId, username: OPPONENTS[0].odentName, avatarUrl: null }],
                color: 'red',
                score: 0
            }
        ],
        score: [6, 0],
        multiplier: 1,
        startTime: new Date(now - 1 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        duration: 420,
        status: 'completed',
        winner: 0,
        playerIds: [userId, OPPONENTS[0].odentId],
        goals: [
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'defense', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'goalkeeper', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
        ]
    });

    // Game 2: Defeat 0-6 (Perfect game conceded)
    games.push({
        gameId: `test-game-${now}-2`,
        venueId: VENUES[1].venueId,
        venueName: VENUES[1].name,
        gameType: '6',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 0
            },
            {
                players: [{ userId: OPPONENTS[1].odentId, username: OPPONENTS[1].odentName, avatarUrl: null }],
                color: 'red',
                score: 6
            }
        ],
        score: [0, 6],
        multiplier: 1,
        startTime: new Date(now - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        duration: 300,
        status: 'completed',
        winner: 1,
        playerIds: [userId, OPPONENTS[1].odentId],
        goals: [
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[1].odentId, scorerName: OPPONENTS[1].odentName, teamIndex: 1, points: 1 },
        ]
    });

    // Game 3: Victory 6-4 vs MaxFoot
    games.push({
        gameId: `test-game-${now}-3`,
        venueId: VENUES[0].venueId,
        venueName: VENUES[0].name,
        gameType: '6',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 6
            },
            {
                players: [{ userId: OPPONENTS[0].odentId, username: OPPONENTS[0].odentName, avatarUrl: null }],
                color: 'red',
                score: 4
            }
        ],
        score: [6, 4],
        multiplier: 1,
        startTime: new Date(now - 3 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        duration: 600,
        status: 'completed',
        winner: 0,
        playerIds: [userId, OPPONENTS[0].odentId],
        goals: [
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'defense', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g7', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g8', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g9', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g10', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
        ]
    });

    // Game 4: Defeat 5-6 vs ThomasKicker
    games.push({
        gameId: `test-game-${now}-4`,
        venueId: VENUES[2].venueId,
        venueName: VENUES[2].name,
        gameType: '6',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 5
            },
            {
                players: [{ userId: OPPONENTS[2].odentId, username: OPPONENTS[2].odentName, avatarUrl: null }],
                color: 'red',
                score: 6
            }
        ],
        score: [5, 6],
        multiplier: 1,
        startTime: new Date(now - 4 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
        duration: 720,
        status: 'completed',
        winner: 1,
        playerIds: [userId, OPPONENTS[2].odentId],
        goals: [
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g7', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
            { id: 'g8', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g9', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
            { id: 'g10', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
            { id: 'g11', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[2].odentId, scorerName: OPPONENTS[2].odentName, teamIndex: 1, points: 1 },
        ]
    });

    // Game 5: Victory 11-8 (match en 11)
    games.push({
        gameId: `test-game-${now}-5`,
        venueId: VENUES[0].venueId,
        venueName: VENUES[0].name,
        gameType: '11',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 11
            },
            {
                players: [{ userId: OPPONENTS[3].odentId, username: OPPONENTS[3].odentName, avatarUrl: null }],
                color: 'red',
                score: 8
            }
        ],
        score: [11, 8],
        multiplier: 1,
        startTime: new Date(now - 5 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
        duration: 900,
        status: 'completed',
        winner: 0,
        playerIds: [userId, OPPONENTS[3].odentId],
        goals: [
            // User goals (11)
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'defense', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'goalkeeper', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g7', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g8', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g9', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g10', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g11', timestamp: new Date(), type: 'attack', position: 'defense', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            // Opponent goals (8)
            { id: 'g12', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g13', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g14', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g15', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g16', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g17', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g18', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
            { id: 'g19', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[3].odentId, scorerName: OPPONENTS[3].odentName, teamIndex: 1, points: 1 },
        ]
    });

    // Game 6: Victory 6-3 vs MaxFoot (3rd game vs same opponent)
    games.push({
        gameId: `test-game-${now}-6`,
        venueId: VENUES[0].venueId,
        venueName: VENUES[0].name,
        gameType: '6',
        teams: [
            {
                players: [{ userId, username, avatarUrl: null }],
                color: 'blue',
                score: 6
            },
            {
                players: [{ userId: OPPONENTS[0].odentId, username: OPPONENTS[0].odentName, avatarUrl: null }],
                color: 'red',
                score: 3
            }
        ],
        score: [6, 3],
        multiplier: 1,
        startTime: new Date(now - 6 * 24 * 60 * 60 * 1000),
        startedAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
        duration: 480,
        status: 'completed',
        winner: 0,
        playerIds: [userId, OPPONENTS[0].odentId],
        goals: [
            { id: 'g1', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g2', timestamp: new Date(), type: 'attack', position: 'midfield', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g3', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g4', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g5', timestamp: new Date(), type: 'attack', position: 'defense', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g6', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g7', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
            { id: 'g8', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: OPPONENTS[0].odentId, scorerName: OPPONENTS[0].odentName, teamIndex: 1, points: 1 },
            { id: 'g9', timestamp: new Date(), type: 'attack', position: 'attack', scoredBy: userId, scorerName: username, teamIndex: 0, points: 1 },
        ]
    });

    return games;
}

export default function SeedPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, initialize } = useAuthStore();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    const handleSeed = async () => {
        if (!user) return;

        setStatus('loading');
        setMessage('Création des données de test...');

        try {
            const db = getFirebaseDb();

            // Create opponent users (minimal data)
            for (const opponent of OPPONENTS) {
                await setDoc(doc(db, 'users', opponent.odentId), {
                    odentId: opponent.odentId,
                    userId: opponent.odentId,
                    username: opponent.odentName,
                    createdAt: new Date(),
                    stats: {
                        totalGames: 5,
                        wins: 2,
                        losses: 3,
                        goalsScored: 20,
                        goalsConceded: 25,
                        winRate: 0.4
                    }
                });
            }
            setMessage('Adversaires créés...');

            // Create venues
            for (const venue of VENUES) {
                await setDoc(doc(db, 'venues', venue.venueId), {
                    venueId: venue.venueId,
                    name: venue.name,
                    type: venue.venueId.includes('bar') ? 'bar' : 'home',
                    createdAt: new Date(),
                    createdBy: user.userId,
                    stats: {
                        totalGames: 10,
                        activePlayersCount: 5
                    }
                });
            }
            setMessage('Lieux créés...');

            // Create test games
            const games = generateTestGames(user.userId, user.username, Date.now());
            for (const game of games) {
                await setDoc(doc(db, 'games', game.gameId), game);
            }
            setMessage(`${games.length} parties créées!`);

            setStatus('success');
            setMessage(`Données de test créées avec succès pour ${user.username}!

${games.length} parties ont été ajoutées à ton historique.

Tu peux maintenant aller voir tes stats.`);

        } catch (error) {
            console.error('Error seeding data:', error);
            setStatus('error');
            setMessage(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[var(--color-field-green)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <FieldBackground />

            <div className="relative z-10 max-w-md mx-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">Seed Test Data</h1>
                </div>

                <div className="bg-[var(--color-pitch-medium)] rounded-2xl p-6 border border-white/10">
                    <p className="text-gray-300 mb-6">
                        Cette page crée des parties fictives pour tester l'affichage des statistiques avancées.
                    </p>

                    {user && (
                        <div className="bg-black/20 rounded-xl p-4 mb-4">
                            <p className="text-white font-semibold">Connecté en tant que: {user.username}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="bg-black/20 rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-2">Données qui seront créées:</h3>
                            <ul className="text-gray-400 text-sm space-y-1">
                                <li>• 4 adversaires fictifs</li>
                                <li>• 3 lieux de jeu</li>
                                <li>• 6 parties avec différents résultats:</li>
                                <li className="ml-4">- 4 victoires, 2 défaites</li>
                                <li className="ml-4">- 1 perfect game infligé (6-0)</li>
                                <li className="ml-4">- 1 perfect game concédé (0-6)</li>
                                <li className="ml-4">- 1 match en 11 points</li>
                                <li className="ml-4">- 3 matchs vs le même adversaire (MaxFoot)</li>
                            </ul>
                        </div>

                        {status !== 'idle' && (
                            <div className={`rounded-xl p-4 ${status === 'success' ? 'bg-green-500/20 border border-green-500/50' :
                                status === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                                    'bg-blue-500/20 border border-blue-500/50'
                                }`}>
                                <p className="text-white whitespace-pre-line">{message}</p>
                            </div>
                        )}

                        <button
                            onClick={handleSeed}
                            disabled={status === 'loading' || !user}
                            className="w-full py-3 px-4 bg-[var(--color-field-green)] hover:bg-[var(--color-field-light)] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Création en cours...' : 'Créer les données de test'}
                        </button>

                        {status === 'success' && (
                            <button
                                onClick={() => router.push('/profile')}
                                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                            >
                                Voir mes stats
                            </button>
                        )}

                        <div className="border-t border-white/10 pt-4 mt-4">
                            <h3 className="text-white font-semibold mb-3">Outils de maintenance</h3>
                            <button
                                onClick={async () => {
                                    setStatus('loading');
                                    setMessage('Recalcul des stats des lieux...');
                                    try {
                                        await recalculateVenueStats();
                                        setStatus('success');
                                        setMessage('Stats des lieux recalculées avec succès!');
                                    } catch (error) {
                                        setStatus('error');
                                        setMessage(`Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    }
                                }}
                                disabled={status === 'loading'}
                                className="w-full py-3 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/50"
                            >
                                Recalculer les stats des lieux
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
