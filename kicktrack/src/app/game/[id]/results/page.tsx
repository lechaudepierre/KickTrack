'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/common/ui';
import { getGame } from '@/lib/firebase/games';
import { Game, GoalPosition } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    TrophyIcon,
    ArrowPathIcon,
    HomeIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

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
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="container-center">
                <div className="text-center">
                    <p className="text-secondary mb-4">Résultats introuvables</p>
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
        <div className={styles.pageContainer}>
            <FieldBackground />

            {/* Background celebration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[var(--color-field-green)] rounded-full blur-3xl animate-pulse" style={{ opacity: 0.2 }} />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--color-accent-yellow)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s', opacity: 0.2 }} />
            </div>

            <div className={styles.contentWrapper}>
                {/* Trophy */}
                <div className="text-center mb-6">
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '5rem',
                        height: '5rem',
                        background: 'linear-gradient(135deg, var(--color-accent-yellow) 0%, var(--color-accent-orange) 100%)',
                        borderRadius: '50%',
                        boxShadow: '0 10px 30px rgba(255, 193, 7, 0.3)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <TrophyIcon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Partie terminée !</h1>
                    <p className="text-secondary">{game.venueName}</p>
                </div>

                {/* Final Score */}
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
                        <div style={{
                            textAlign: 'center',
                            flex: 1,
                            transform: game.winnerId === '0' ? 'scale(1.05)' : 'none',
                            opacity: game.winnerId === '0' ? 1 : 0.75,
                            transition: 'all 0.3s'
                        }}>
                            <p className="text-sm text-secondary mb-2 truncate px-2">
                                {game.teams[0].players.map(p => p.username).join(' & ')}
                            </p>
                            <p style={{
                                fontSize: '3rem',
                                fontWeight: 800,
                                color: game.winnerId === '0' ? 'var(--color-field-green)' : 'var(--color-text-secondary)',
                                lineHeight: 1
                            }}>
                                {game.teams[0].score}
                            </p>
                            {game.winnerId === '0' && (
                                <span style={{
                                    display: 'inline-block',
                                    marginTop: '0.5rem',
                                    padding: '0.25rem 0.75rem',
                                    background: 'rgba(76, 175, 80, 0.2)',
                                    color: 'var(--color-field-green)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-full)'
                                }}>
                                    🏆 Victoire
                                </span>
                            )}
                        </div>

                        {/* Separator */}
                        <div className="px-4">
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem', fontWeight: 500 }}>-</p>
                        </div>

                        {/* Team 2 */}
                        <div style={{
                            textAlign: 'center',
                            flex: 1,
                            transform: game.winnerId === '1' ? 'scale(1.05)' : 'none',
                            opacity: game.winnerId === '1' ? 1 : 0.75,
                            transition: 'all 0.3s'
                        }}>
                            <p className="text-sm text-secondary mb-2 truncate px-2">
                                {game.teams[1].players.map(p => p.username).join(' & ')}
                            </p>
                            <p style={{
                                fontSize: '3rem',
                                fontWeight: 800,
                                color: game.winnerId === '1' ? 'var(--color-field-green)' : 'var(--color-text-secondary)',
                                lineHeight: 1
                            }}>
                                {game.teams[1].score}
                            </p>
                            {game.winnerId === '1' && (
                                <span style={{
                                    display: 'inline-block',
                                    marginTop: '0.5rem',
                                    padding: '0.25rem 0.75rem',
                                    background: 'rgba(76, 175, 80, 0.2)',
                                    color: 'var(--color-field-green)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-full)'
                                }}>
                                    🏆 Victoire
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid-2" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    {/* MVP */}
                    {mvp && (
                        <div style={{
                            gridColumn: 'span 2',
                            background: 'linear-gradient(90deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 152, 0, 0.2) 100%)',
                            border: '1px solid rgba(255, 193, 7, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-md)'
                        }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-accent-yellow)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>MVP</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    background: 'var(--color-accent-yellow)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--color-pitch-dark)',
                                    fontWeight: 800
                                }}>
                                    {mvp.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, color: 'white' }}>{mvp.username}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--color-accent-yellow)' }}>{mvpGoals} buts</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Duration */}
                    <div style={{
                        background: 'var(--color-pitch-medium)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)'
                    }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Durée</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{formatDuration(game.duration)}</p>
                    </div>

                    {/* Total Goals */}
                    <div style={{
                        background: 'var(--color-pitch-medium)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)'
                    }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total buts</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{game.goals.length}</p>
                    </div>
                </div>

                {/* Goals by Position */}
                <div style={{
                    background: 'var(--color-pitch-medium)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--spacing-md)' }}>Buts par position</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        {Object.entries(goalsByPosition).map(([position, count]) => (
                            <div key={position} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--color-pitch-dark)', borderRadius: 'var(--radius-sm)' }}>
                                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white' }}>{count}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{positionLabels[position as GoalPosition].split(' ')[0]}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <Link href="/game/new">
                        <div className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <ArrowPathIcon className="h-5 w-5" />
                                Nouvelle partie
                            </div>
                        </div>
                    </Link>

                    <div className="grid-2">
                        <Link href="/profile">
                            <div className="btn-secondary">
                                <div className="btn-secondary-shadow" />
                                <div className="btn-secondary-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <ChartBarIcon className="h-5 w-5" />
                                    Stats
                                </div>
                            </div>
                        </Link>
                        <Link href="/dashboard">
                            <div className="btn-secondary">
                                <div className="btn-secondary-shadow" />
                                <div className="btn-secondary-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <HomeIcon className="h-5 w-5" />
                                    Accueil
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
