'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { subscribeToGame, addGoal, removeLastGoal, endGame, abandonGame } from '@/lib/firebase/games';
import { Game, GoalPosition } from '@/types';
import { Button } from '@/components/ui';
import GameTimer from '@/components/game/GameTimer';
import GoalTimeline from '@/components/game/GoalTimeline';
import AddGoalModal from '@/components/game/AddGoalModal';
import {
    ArrowLeftIcon,
    EllipsisVerticalIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

export default function GamePage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { user, initialize } = useAuthStore();

    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [goalModal, setGoalModal] = useState<{ isOpen: boolean; teamIndex: 0 | 1 }>({
        isOpen: false,
        teamIndex: 0
    });

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!gameId) return;

        const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
            setGame(updatedGame);
            setIsLoading(false);

            // Check if game is completed
            if (updatedGame?.status === 'completed') {
                router.push(`/game/${gameId}/results`);
            }
        });

        return () => unsubscribe();
    }, [gameId, router]);

    const handleAddGoal = async (scorerId: string, scorerName: string, position: GoalPosition) => {
        if (!game) return;

        try {
            await addGoal(game.gameId, scorerId, scorerName, goalModal.teamIndex, position);
        } catch (error) {
            console.error('Error adding goal:', error);
        }
    };

    const handleRemoveLastGoal = async () => {
        if (!game) return;

        try {
            await removeLastGoal(game.gameId);
        } catch (error) {
            console.error('Error removing goal:', error);
        }
    };

    const handleEndGame = async () => {
        if (!game) return;

        try {
            await endGame(game.gameId);
            router.push(`/game/${gameId}/results`);
        } catch (error) {
            console.error('Error ending game:', error);
        }
    };

    const handleAbandon = async () => {
        if (!game) return;

        if (confirm('Êtes-vous sûr de vouloir abandonner ? Cette partie sera supprimée.')) {
            try {
                await abandonGame(game.gameId);
                router.push('/dashboard');
            } catch (error) {
                console.error('Error abandoning game:', error);
            }
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
                    <p className="text-slate-400 mb-4">Partie introuvable</p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        );
    }

    const team1 = game.teams[0];
    const team2 = game.teams[1];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="p-4 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div>
                            <p className="text-sm text-slate-400">{game.venueName}</p>
                            <GameTimer startedAt={game.startedAt} />
                        </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <EllipsisVerticalIcon className="h-6 w-6" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => { handleRemoveLastGoal(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                        disabled={game.goals.length === 0}
                                    >
                                        Annuler le dernier but
                                    </button>
                                    <button
                                        onClick={() => { handleEndGame(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                                    >
                                        Terminer la partie
                                    </button>
                                    <button
                                        onClick={() => { handleAbandon(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        Abandonner
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Score Display */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-4">
                    <div className="flex items-center justify-between">
                        {/* Team 1 */}
                        <div className="text-center flex-1">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">🔵</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-1 truncate px-2">
                                {team1.players.map(p => p.username).join(' & ')}
                            </p>
                            <p className="text-5xl font-bold text-blue-400">{team1.score}</p>
                        </div>

                        {/* VS */}
                        <div className="px-4">
                            <p className="text-slate-600 text-lg font-medium">vs</p>
                        </div>

                        {/* Team 2 */}
                        <div className="text-center flex-1">
                            <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">🔴</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-1 truncate px-2">
                                {team2.players.map(p => p.username).join(' & ')}
                            </p>
                            <p className="text-5xl font-bold text-rose-400">{team2.score}</p>
                        </div>
                    </div>

                    {/* Target Score */}
                    <p className="text-center text-slate-500 text-sm mt-4">
                        Premier à {game.targetScore} buts
                    </p>
                </div>

                {/* Add Goal Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={() => setGoalModal({ isOpen: true, teamIndex: 0 })}
                        className="flex items-center justify-center gap-2 py-6 bg-blue-500/20 border-2 border-blue-500/30 rounded-xl text-blue-400 font-semibold hover:bg-blue-500/30 hover:border-blue-500/50 transition-all active:scale-[0.98]"
                    >
                        <PlusIcon className="h-6 w-6" />
                        But 🔵
                    </button>
                    <button
                        onClick={() => setGoalModal({ isOpen: true, teamIndex: 1 })}
                        className="flex items-center justify-center gap-2 py-6 bg-rose-500/20 border-2 border-rose-500/30 rounded-xl text-rose-400 font-semibold hover:bg-rose-500/30 hover:border-rose-500/50 transition-all active:scale-[0.98]"
                    >
                        <PlusIcon className="h-6 w-6" />
                        But 🔴
                    </button>
                </div>

                {/* Goal Timeline */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                        Historique des buts
                    </h3>
                    <GoalTimeline
                        goals={game.goals}
                        onRemoveGoal={handleRemoveLastGoal}
                        canRemove={game.goals.length > 0}
                    />
                </div>
            </div>

            {/* Add Goal Modal */}
            <AddGoalModal
                isOpen={goalModal.isOpen}
                onClose={() => setGoalModal({ ...goalModal, isOpen: false })}
                onConfirm={handleAddGoal}
                teamPlayers={game.teams[goalModal.teamIndex].players}
                teamName={goalModal.teamIndex === 0 ? 'Équipe Bleue' : 'Équipe Rouge'}
                teamColor={goalModal.teamIndex === 0 ? 'blue' : 'rose'}
            />
        </div>
    );
}
