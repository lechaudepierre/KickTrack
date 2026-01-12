'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getTournamentByPinCode, joinTournament } from '@/lib/firebase/tournaments';
import { formatPinCode, validatePinCode } from '@/lib/utils/code-generator';
import { FieldBackground } from '@/components/FieldDecorations';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

function JoinTournamentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [pinCode, setPinCode] = useState('');
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
            router.push('/');
        }
    }, [authLoading, isAuthenticated, router]);

    // Check for code in URL params
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setPinCode(code);
            handleJoin(code);
        }
    }, [searchParams]);

    const handleCodeChange = (value: string) => {
        const formatted = formatPinCode(value);
        setPinCode(formatted);
    };

    const handleJoin = async (code?: string) => {
        const codeToUse = code || pinCode;

        if (!validatePinCode(codeToUse)) {
            setError('Format de code invalide (ex: ABC-123)');
            return;
        }

        if (!user) {
            setError('Vous devez etre connecte');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const tournament = await getTournamentByPinCode(codeToUse);

            if (!tournament) {
                setError('Code invalide ou tournoi expire');
                return;
            }

            if (tournament.status !== 'waiting') {
                setError('Ce tournoi a deja commence');
                return;
            }

            // Check if user is already in the tournament
            const isAlreadyIn = tournament.players.some(p => p.userId === user.userId);

            if (!isAlreadyIn) {
                await joinTournament(tournament.tournamentId, {
                    userId: user.userId,
                    username: user.username,
                    avatarUrl: user.avatarUrl
                });
            }

            router.push(`/tournament/${tournament.tournamentId}`);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la connexion';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
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
                        onClick={() => router.back()}
                        className={styles.backButton}
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>Rejoindre Tournoi</h1>
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div className="text-center">
                        <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Entrez le code fourni par l&apos;organisateur du tournoi
                        </p>

                        <div className="relative">
                            <input
                                type="text"
                                value={pinCode}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                placeholder="ABC-123"
                                maxLength={7}
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    fontSize: '2.25rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    letterSpacing: '0.3em',
                                    padding: '1.5rem',
                                    background: 'var(--color-pitch-medium)',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-lg)',
                                    color: 'var(--color-field-green)',
                                    textTransform: 'uppercase',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => handleJoin()}
                        disabled={pinCode.length < 7 || isLoading}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            background: '#FFD700',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-dark)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: pinCode.length < 7 || isLoading ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            opacity: pinCode.length < 7 || isLoading ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (pinCode.length >= 7 && !isLoading) {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 6px 0 rgba(0, 0, 0, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? 'Connexion...' : 'Rejoindre le tournoi'}
                    </button>
                </div>

                {/* Back link */}
                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="container-center">
            <div className={styles.spinner} />
        </div>
    );
}

export default function JoinTournamentPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <JoinTournamentContent />
        </Suspense>
    );
}
