'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { subscribeToGame, addGoal, removeLastGoal, endGame, abandonGame } from '@/lib/firebase/games';
import { Game, GoalPosition } from '@/types';
import { Button } from '@/components/common/ui';
import GameTimer from '@/components/game/GameTimer';
import GoalTimeline from '@/components/game/GoalTimeline';
import AddGoalModal from '@/components/game/AddGoalModal';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    EllipsisVerticalIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

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
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="container-center">
                <div className="text-center">
                    <p className="text-secondary mb-4">Partie introuvable</p>
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
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <div className={styles.pageHeader} style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className={styles.backButton}
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div>
                            <p className="text-sm text-secondary">{game.venueName}</p>
                            <GameTimer startedAt={game.startedAt} />
                        </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className={styles.backButton}
                        >
                            <EllipsisVerticalIcon className="h-6 w-6" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-pitch-medium)] border border-[var(--color-border-default)] rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => { handleRemoveLastGoal(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[var(--color-pitch-dark)] transition-colors"
                                        disabled={game.goals.length === 0}
                                    >
                                        Annuler le dernier but
                                    </button>
                                    <button
                                        onClick={() => { handleEndGame(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[var(--color-pitch-dark)] transition-colors"
                                    >
                                        Terminer la partie
                                    </button>
                                    <button
                                        onClick={() => { handleAbandon(); setShowMenu(false); }}
                                        className="w-full px-4 py-3 text-left text-sm text-[var(--color-accent-orange)] hover:bg-[rgba(255,152,0,0.1)] transition-colors"
                                    >
                                        Abandonner
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Score Display */}
                <div style={{
                    background: 'var(--color-pitch-medium)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-lg)',
                    marginBottom: 'var(--spacing-lg)',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Team 1 */}
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{
                                width: '3rem',
                                height: '3rem',
                                background: 'rgba(33, 150, 243, 0.2)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto var(--spacing-sm)'
                            }}>
                                <span className="text-xl">🔵</span>
                            </div>
                            <p className="text-sm text-secondary mb-1 truncate px-2">
                                {team1.players.map(p => p.username).join(' & ')}
                            </p>
                            <p style={{ fontSize: '3rem', fontWeight: 800, color: '#60A5FA', lineHeight: 1 }}>{team1.score}</p>
                        </div>

                        {/* VS */}
                        <div className="px-4">
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem', fontWeight: 500 }}>vs</p>
                        </div>

                        {/* Team 2 */}
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{
                                width: '3rem',
                                height: '3rem',
                                background: 'rgba(244, 67, 54, 0.2)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto var(--spacing-sm)'
                            }}>
                                <span className="text-xl">🔴</span>
                            </div>
                            <p className="text-sm text-secondary mb-1 truncate px-2">
                                {team2.players.map(p => p.username).join(' & ')}
                            </p>
                            <p style={{ fontSize: '3rem', fontWeight: 800, color: '#F87171', lineHeight: 1 }}>{team2.score}</p>
                        </div>
                    </div>

                    {/* Target Score */}
                    <p className="text-center text-secondary text-sm mt-4">
                        Premier à {game.targetScore} buts
                    </p>
                </div>

                {/* Add Goal Buttons */}
                <div className="grid-2" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <button
                        onClick={() => setGoalModal({ isOpen: true, teamIndex: 0 })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1.5rem',
                            background: 'rgba(33, 150, 243, 0.1)',
                            border: '2px solid rgba(33, 150, 243, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#60A5FA',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        <PlusIcon className="h-6 w-6" />
                        But 🔵
                    </button>
                    <button
                        onClick={() => setGoalModal({ isOpen: true, teamIndex: 1 })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1.5rem',
                            background: 'rgba(244, 67, 54, 0.1)',
                            border: '2px solid rgba(244, 67, 54, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#F87171',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        <PlusIcon className="h-6 w-6" />
                        But 🔴
                    </button>
                </div>

                {/* Goal Timeline */}
                <div style={{
                    background: 'var(--color-pitch-medium)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-md)'
                }}>
                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">
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
