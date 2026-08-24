'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getTournamentByPinCode, joinTournament } from '@/lib/firebase/tournaments';
import { formatPinCode, validatePinCode } from '@/lib/utils/code-generator';
import { FieldBackground } from '@/components/FieldDecorations';
import styles from '@/styles/content-page.module.css';
import { PageHeader, Button } from '@/components/common/ui';

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
                <PageHeader title="Rejoindre Tournoi" />

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Entrez le code fourni par l&apos;organisateur du tournoi
                        </p>

                        <div style={{ position: 'relative' }}>
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
                                    background: 'var(--field-light)',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    borderRadius: 'var(--radius-lg)',
                                    color: 'var(--field-dark)',
                                    textTransform: 'uppercase',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <Button onClick={() => handleJoin()}
                        disabled={pinCode.length < 7}
                        isLoading={isLoading}
                        variant="accent"
                        fullWidth
                    >
                        {isLoading ? 'Connexion...' : 'Rejoindre le tournoi'}
                    </Button>
                </div>

                {/* Back link */}
                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Button onClick={() => router.push('/dashboard')} variant="ghost" size="sm">
                        Retour au tableau de bord
                    </Button>
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
