'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { getGame } from '@/lib/firebase/games';
import { Game, GoalPosition } from '@/types';
import {
    TrophyIcon,
    ArrowPathIcon,
    HomeIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

const positionLabels: Record<GoalPosition, string> = {
    defense: 'Défense',
    attack1: 'Attaque 1',
    attack2: 'Attaque 2',
    attack3: 'Attaque 3'
};

export default function GameResultsPage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;

    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadGame();
    }, [gameId]);

    const loadGame = async () => {
        try {
            const data = await getGame(gameId);
            setGame(data);
        } catch (error) {
            console.error('Error loading game:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-400 mb-4">Résultats introuvables</p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        );
    }

    const winner = game.winnerId !== undefined ? game.teams[parseInt(game.winnerId)] : null;
    const loser = game.winnerId !== undefined ? game.teams[1 - parseInt(game.winnerId)] : null;

    // Calculate stats
    const goalsByPlayer: Record<string, number> = {};
    const goalsByPosition: Record<GoalPosition, number> = {
        defense: 0,
        attack1: 0,
        attack2: 0,
        attack3: 0
    };

    for (const goal of game.goals) {
        goalsByPlayer[goal.scorerId] = (goalsByPlayer[goal.scorerId] || 0) + 1;
        goalsByPosition[goal.position]++;
    }

    // Find MVP
    let mvpId = '';
    let mvpGoals = 0;
    for (const [playerId, goals] of Object.entries(goalsByPlayer)) {
        if (goals > mvpGoals) {
            mvpId = playerId;
            mvpGoals = goals;
        }
    }

    const mvp = [...game.teams[0].players, ...game.teams[1].players]
        .find(p => p.userId === mvpId);

    // Format duration
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background celebration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>

            <div className="relative z-10 p-6 max-w-lg mx-auto">
                {/* Trophy */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-lg shadow-yellow-500/30 mb-4">
                        <TrophyIcon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Partie terminée !</h1>
                    <p className="text-slate-400">{game.venueName}</p>
                </div>

                {/* Final Score */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        {/* Team 1 */}
                        <div className={`text-center flex-1 ${game.winnerId === '0' ? 'scale-105' : 'opacity-75'}`}>
                            <p className="text-sm text-slate-400 mb-2 truncate px-2">
                                {game.teams[0].players.map(p => p.username).join(' & ')}
                            </p>
                            <p className={`text-5xl font-bold ${game.winnerId === '0' ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                {game.teams[0].score}
                            </p>
                            {game.winnerId === '0' && (
                                <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                    🏆 Victoire
                                </span>
                            )}
                        </div>

                        {/* Separator */}
                        <div className="px-4">
                            <p className="text-slate-600 text-lg font-medium">-</p>
                        </div>

                        {/* Team 2 */}
                        <div className={`text-center flex-1 ${game.winnerId === '1' ? 'scale-105' : 'opacity-75'}`}>
                            <p className="text-sm text-slate-400 mb-2 truncate px-2">
                                {game.teams[1].players.map(p => p.username).join(' & ')}
                            </p>
                            <p className={`text-5xl font-bold ${game.winnerId === '1' ? 'text-emerald-400' : 'text-slate-400'
                                }`}>
                                {game.teams[1].score}
                            </p>
                            {game.winnerId === '1' && (
                                <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                                    🏆 Victoire
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* MVP */}
                    {mvp && (
                        <div className="col-span-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4">
                            <p className="text-xs text-yellow-400/70 uppercase tracking-wider mb-1">MVP</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {mvp.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{mvp.username}</p>
                                    <p className="text-sm text-yellow-400">{mvpGoals} buts</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Duration */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Durée</p>
                        <p className="text-2xl font-bold text-white">{formatDuration(game.duration)}</p>
                    </div>

                    {/* Total Goals */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total buts</p>
                        <p className="text-2xl font-bold text-white">{game.goals.length}</p>
                    </div>
                </div>

                {/* Goals by Position */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 mb-6">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Buts par position</p>
                    <div className="grid grid-cols-4 gap-2">
                        {Object.entries(goalsByPosition).map(([position, count]) => (
                            <div key={position} className="text-center p-2 bg-slate-900/50 rounded-lg">
                                <p className="text-lg font-bold text-white">{count}</p>
                                <p className="text-xs text-slate-500">{positionLabels[position as GoalPosition].split(' ')[0]}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link href="/game/new" className="block">
                        <Button fullWidth variant="primary">
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Nouvelle partie
                        </Button>
                    </Link>

                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/profile">
                            <Button fullWidth variant="secondary">
                                <ChartBarIcon className="h-5 w-5 mr-2" />
                                Stats
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button fullWidth variant="ghost">
                                <HomeIcon className="h-5 w-5 mr-2" />
                                Accueil
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
