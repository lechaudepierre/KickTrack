'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { subscribeToGame, addGoal, removeLastGoal, endGame, abandonGame, forfeitGame } from '@/lib/firebase/games';
import { Game, GoalPosition, GoalType } from '@/types';
import { Button } from '@/components/common/ui';
import GameBoard from '@/components/game/GameBoard';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    EllipsisVerticalIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import gameStyles from './game-page.module.css';

export default function GamePage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { user, initialize, isLoading: authLoading } = useAuthStore();

    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!gameId || authLoading) return;

        const unsubscribe = subscribeToGame(gameId, (updatedGame) => {
            setGame(updatedGame);
            setIsLoading(false);

            // Check if game is completed
            if (updatedGame?.status === 'completed') {
                router.push(`/game/${gameId}/results`);
            }
        });

        return () => unsubscribe();
    }, [gameId, router, authLoading]);

    const [showEndModal, setShowEndModal] = useState(false);

    const handleAddGoal = async (teamIndex: 0 | 1, scorerId: string, scorerName: string, position: GoalPosition, type: GoalType) => {
        if (!game) return;

        try {
            await addGoal(game.gameId, scorerId, scorerName, teamIndex, position, type);
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
        setShowEndModal(true);
    };

    const handleForfeit = async (teamIndex: 0 | 1) => {
        if (!game) return;
        try {
            await forfeitGame(game.gameId, teamIndex);
            router.push(`/game/${gameId}/results`);
        } catch (error) {
            console.error('Error forfeiting game:', error);
        }
    };

    const handleCancelGame = async () => {
        if (!game) return;
        if (confirm('Êtes-vous sûr de vouloir annuler la partie ? Aucun score ne sera enregistré.')) {
            try {
                await abandonGame(game.gameId);
                router.push('/dashboard');
            } catch (error) {
                console.error('Error cancelling game:', error);
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
                            className={gameStyles.menuButton}
                        >
                            <EllipsisVerticalIcon className="h-6 w-6" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className={gameStyles.dropdownMenu}>
                                    <button
                                        onClick={() => { handleRemoveLastGoal(); setShowMenu(false); }}
                                        className={gameStyles.menuItem}
                                        disabled={game.goals.length === 0}
                                    >
                                        <span>Annuler le dernier but</span>
                                        <span className="opacity-40 text-xs font-bold tracking-wider">UNDO</span>
                                    </button>
                                    <button
                                        onClick={() => { handleEndGame(); setShowMenu(false); }}
                                        className={gameStyles.menuItem}
                                    >
                                        <span>Terminer la partie</span>
                                        <span className="opacity-40 text-xs font-bold tracking-wider">FINISH</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* End Game Modal */}
                {showEndModal && (
                    <div className={gameStyles.modalOverlay}>
                        <div className={gameStyles.modalContent}>
                            <div className={gameStyles.modalHeader}>
                                <h3 className={gameStyles.modalTitle}>Terminer la partie</h3>
                                <button onClick={() => setShowEndModal(false)} className={gameStyles.closeButton}>
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className={gameStyles.modalBody}>
                                <button
                                    onClick={() => handleForfeit(0)}
                                    className={`${gameStyles.optionButton} ${gameStyles.forfeitButton}`}
                                >
                                    <span className={gameStyles.optionTitle}>Équipe 1 abandonne</span>
                                    <span className={gameStyles.optionDesc}>Victoire par forfait ({game.gameType} pts) pour l'Équipe 2</span>
                                </button>

                                <button
                                    onClick={() => handleForfeit(1)}
                                    className={`${gameStyles.optionButton} ${gameStyles.forfeitButton}`}
                                >
                                    <span className={gameStyles.optionTitle}>Équipe 2 abandonne</span>
                                    <span className={gameStyles.optionDesc}>Victoire par forfait ({game.gameType} pts) pour l'Équipe 1</span>
                                </button>

                                <div className="pt-4">
                                    <button
                                        onClick={handleCancelGame}
                                        className={`${gameStyles.optionButton} ${gameStyles.cancelButton}`}
                                    >
                                        <span className={gameStyles.optionTitle}>Annuler la partie</span>
                                        <span className={gameStyles.optionDesc}>Supprimer la partie sans enregistrer de stats</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Board */}
                <GameBoard
                    game={game}
                    onAddGoal={handleAddGoal}
                />
            </div>
        </div>
    );
}
