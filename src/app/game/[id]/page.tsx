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
    const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
    const [isPortrait, setIsPortrait] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const mediaQuery = window.matchMedia('(orientation: portrait)');
        const checkOrientation = (e: MediaQueryListEvent | MediaQueryList) => {
            setIsPortrait(e.matches);
        };

        checkOrientation(mediaQuery);
        mediaQuery.addEventListener('change', checkOrientation);
        return () => mediaQuery.removeEventListener('change', checkOrientation);
    }, []);

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
    const [showBackModal, setShowBackModal] = useState(false);
    const [isEndingGame, setIsEndingGame] = useState(false);

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

    // Prevent accidental back navigation (swipe back)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Push a larger number of dummy states to create a stronger buffer
        // This makes it harder for rapid swipe gestures to escape.
        for (let i = 0; i < 10; i++) {
            window.history.pushState({ noBack: i }, '', window.location.href);
        }

        const handlePopState = (e: PopStateEvent) => {
            // Re-push multiple states immediately to keep the "trap" very deep
            for (let i = 0; i < 5; i++) {
                window.history.pushState({ noBack: Date.now() + i }, '', window.location.href);
            }

            // Show the custom confirmation modal
            setShowBackModal(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const handleEndGame = () => {
        if (!game) return;
        setShowEndModal(true);
    };

    const confirmEndGame = async () => {
        if (!game || isEndingGame) return;

        // Prevent end on draw
        if (game.score[0] === game.score[1]) {
            setError('Impossible de terminer un match sur une égalité. Continuez de jouer !');
            setShowEndModal(false);
            return;
        }

        setIsEndingGame(true);
        try {
            await endGame(game.gameId);
            router.push(`/game/${gameId}/results`);
        } catch (error: any) {
            console.error('Error ending game:', error);
            setError(error.message || 'Erreur lors de la fin du match');
            setShowEndModal(false);
            setIsEndingGame(false);
        }
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
    const getTeamNames = (teamIndex: 0 | 1) => {
        if (!game) return '';
        const team = game.teams[teamIndex];
        return team.players.map(p => p.username).join(' & ');
    };

    const handleCancelGame = async () => {
        if (!game) return;
        try {
            await abandonGame(game.gameId);
            router.push('/dashboard');
        } catch (error) {
            console.error('Error cancelling game:', error);
        }
    };

    /**
     * Fin déclenchée par le CHRONOMÈTRE — chantier 7.10.
     *
     * Pas de fenêtre de confirmation : le coup de sifflet a déjà eu lieu, il
     * n'y a plus rien à confirmer. Et pas de garde anti-égalité non plus —
     * `outcomeAtZero` ne renvoie « vainqueur » que si les scores diffèrent,
     * une égalité part en but en or ou en prolongation.
     */
    const handleChronoEnd = async () => {
        if (!game || isEndingGame) return;
        setIsEndingGame(true);
        try {
            await endGame(game.gameId);
            router.push(`/game/${gameId}/results`);
        } catch (error) {
            console.error('[chrono] fin de partie impossible', error);
            setIsEndingGame(false);
        }
    };

    const handleTimeLimitReached = async () => {
        if (!game || showTimeLimitModal) return;
        setShowTimeLimitModal(true);
        try {
            await abandonGame(game.gameId);
        } catch (error) {
            console.error('Error auto-cancelling game:', error);
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
                <div style={{ textAlign: 'center' }}>
                    <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>Partie introuvable</p>
                    <Button onClick={() => router.push('/dashboard')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.pageContainer} page-match`}>
            <div className={`${styles.contentWrapper} ${isPortrait ? gameStyles.forcedLandscape : gameStyles.nativeLandscape}`}>
                <FieldBackground />
                {/* Header */}
                <div className={`${styles.pageHeader} ${!isPortrait || isPortrait ? gameStyles.landscapeHeader : ''} justify-between`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <button onClick={() => {
                                if (user?.userId === game.hostId) {
                                    setShowBackModal(true);
                                } else {
                                    router.push('/dashboard');
                                }
                            }}
                            className={styles.backButton}
                        >
                            <ArrowLeftIcon width={24} height={24} />
                        </button>
                        {/* Le nom du stade est masqué en paysage : l'en-tête y
                            chevauche le tableau de score, et c'est
                            l'information la moins utile pendant un match — on
                            sait où on joue, on est dessus. */}
                        <div className={gameStyles.venueName}>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-black)', textTransform: 'uppercase', opacity: '0.4' }}>{game.venueName}</p>
                        </div>
                    </div>

                    {/* Menu - Only for Host */}
                    {user?.userId === game.hostId && (
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowMenu(!showMenu)}
                                className={gameStyles.menuButton}
                            >
                                <EllipsisVerticalIcon width={24} height={24} />
                            </button>

                            {showMenu && (
                                <>
                                    <div onClick={() => setShowMenu(false)}
                                    />
                                    <div className={gameStyles.dropdownMenu}>
                                        <button onClick={() => { handleRemoveLastGoal(); setShowMenu(false); }}
                                            className={gameStyles.menuItem}
                                            disabled={game.goals.length === 0}
                                        >
                                            <span>Annuler le dernier but</span>
                                            <span style={{ opacity: '0.4', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' }}>UNDO</span>
                                        </button>
                                        <button onClick={() => { handleEndGame(); setShowMenu(false); }}
                                            className={gameStyles.menuItem}
                                        >
                                            <span>Terminer la partie</span>
                                            <span style={{ opacity: '0.4', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)' }}>FINISH</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{error}</span>
                        <button onClick={() => setError('')}  style={{ marginLeft: 'var(--spacing-md)', opacity: '0.5' }}>
                            <XMarkIcon width={20} height={20} />
                        </button>
                    </div>
                )}

                {/* End Game Modal */}
                {showEndModal && (
                    <div className={gameStyles.modalOverlay}>
                        <div className={gameStyles.modalContent}>
                            <div className={gameStyles.modalHeader}>
                                <h3 className={gameStyles.modalTitle}>Terminer la partie</h3>
                                <button onClick={() => setShowEndModal(false)} className={gameStyles.closeButton}>
                                    <XMarkIcon width={24} height={24} />
                                </button>
                            </div>

                            <div className={gameStyles.modalBody}>
                                <button onClick={confirmEndGame}
                                    disabled={isEndingGame}
                                    className={`${gameStyles.optionButton} ${gameStyles.confirmButton}`}
                                    style={{ border: '3px solid var(--color-background)', backgroundColor: 'var(--green-600)', color: 'white', marginBottom: 'var(--spacing-lg)', opacity: isEndingGame ? 0.6 : 1 }}
                                >
                                    <span className={gameStyles.optionTitle}>{isEndingGame ? 'Enregistrement...' : 'Finir le match normalement'}</span>
                                    <span className={gameStyles.optionDesc} style={{ color: 'rgba(255,255,255,0.8)' }}>Valider les scores actuels</span>
                                </button>

                                <div style={{ color: 'var(--ink-700)', opacity: 0.6, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 'var(--spacing-sm)' }}>Autres options</div>

                                <button onClick={() => handleForfeit(0)}
                                    className={`${gameStyles.optionButton} ${gameStyles.forfeitButton}`}
                                >
                                    <span className={gameStyles.optionTitle}>{getTeamNames(0)} abandonne</span>
                                    <span className={gameStyles.optionDesc}>Défaite par forfait pour votre équipe</span>
                                </button>

                                <button onClick={() => handleForfeit(1)}
                                    className={`${gameStyles.optionButton} ${gameStyles.forfeitButton}`}
                                >
                                    <span className={gameStyles.optionTitle}>{getTeamNames(1)} abandonne</span>
                                    <span className={gameStyles.optionDesc}>Victoire par forfait pour votre équipe</span>
                                </button>

                                <div style={{ paddingTop: 'var(--spacing-md)' }}>
                                    <button onClick={handleCancelGame}
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

                {/* Back Confirmation Modal */}
                {showBackModal && (
                    <div className={gameStyles.modalOverlay}>
                        <div className={gameStyles.modalContent}>
                            <div className={gameStyles.modalHeader}>
                                <h3 className={gameStyles.modalTitle}>Quitter la partie ?</h3>
                                <button onClick={() => setShowBackModal(false)} className={gameStyles.closeButton}>
                                    <XMarkIcon width={24} height={24} />
                                </button>
                            </div>

                            <div className={gameStyles.modalBody}>
                                <p style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
                                    Êtes-vous sûr de vouloir revenir en arrière ? Cela annulera toute la partie.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button onClick={handleCancelGame}
                                        className={`${gameStyles.optionButton} ${gameStyles.cancelButton}`}
                                    >
                                        <span className={gameStyles.optionTitle}>Oui, annuler la partie</span>
                                    </button>

                                    <button onClick={() => setShowBackModal(false)}
                                        className={gameStyles.optionButton}
                                        style={{ background: 'var(--color-surface)', color: 'var(--color-text-dark)' }}
                                    >
                                        <span className={gameStyles.optionTitle}>Non, continuer</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Time Limit Modal */}
                {showTimeLimitModal && (
                    <div className={gameStyles.modalOverlay}>
                        <div className={gameStyles.modalContent}>
                            <div className={gameStyles.modalHeader}>
                                <h3 className={gameStyles.modalTitle}>Temps écoulé !</h3>
                            </div>

                            <div className={gameStyles.modalBody}>
                                <p style={{ color: 'var(--color-text-dark)' }}>
                                    La partie a dépassé la limite de 1 heure et a été annulée.
                                    Aucune statistique ne sera enregistrée.
                                </p>
                                <button onClick={() => router.push('/dashboard')}
                                    className={gameStyles.optionButton}
                                    style={{ background: 'var(--ink-700)', color: 'white' }}
                                >
                                    <span className={gameStyles.optionTitle}>Retour au tableau de bord</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Board */}
                <GameBoard game={game}
                    onAddGoal={handleAddGoal}
                    onTimeLimitReached={handleTimeLimitReached}
                    onEndGame={handleEndGame}
                    onChronoEnd={handleChronoEnd}
                    isViewer={user?.userId !== game.hostId}
                    isPortrait={isPortrait}
                />
            </div>
        </div>
    );
}
