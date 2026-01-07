'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { subscribeToGame, addGoal, removeLastGoal, endGame, abandonGame } from '@/lib/firebase/games';
import { Game, GoalPosition } from '@/types';
import { Button } from '@/components/common/ui';
import GameBoard from '@/components/game/GameBoard';
import AddGoalModal from '@/components/game/AddGoalModal';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    EllipsisVerticalIcon
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
            setGoalModal({ ...goalModal, isOpen: false });
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

                {/* Game Board */}
                <GameBoard
                    game={game}
                    onAddGoal={(teamIndex) => setGoalModal({ isOpen: true, teamIndex })}
                />
            </div>

            {/* Add Goal Modal */}
            <AddGoalModal
                isOpen={goalModal.isOpen}
                onClose={() => setGoalModal({ ...goalModal, isOpen: false })}
                onConfirm={handleAddGoal}
                teamPlayers={game.teams[goalModal.teamIndex].players}
                teamName={goalModal.teamIndex === 0 ? 'Équipe 1' : 'Équipe 2'}
                teamColor={game.teams[goalModal.teamIndex].color}
            />
        </div>
    );
}
