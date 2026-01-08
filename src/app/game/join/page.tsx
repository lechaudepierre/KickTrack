'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/common/ui';
import { useAuthStore } from '@/lib/stores/authStore';
import { getSessionByPinCode, joinGameSession } from '@/lib/firebase/game-sessions';
import { formatPinCode, validatePinCode } from '@/lib/utils/code-generator';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';


function JoinGameContent() {
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

    // Check for code in URL params (from QR scan)
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
            setError('Vous devez être connecté');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const session = await getSessionByPinCode(codeToUse);

            if (!session) {
                setError('Code invalide ou session expirée');
                return;
            }

            await joinGameSession(session.sessionId, {
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl
            });

            // Redirect to waiting room or game
            if (session.status === 'active' && session.gameId) {
                router.push(`/game/${session.gameId}`);
            } else {
                router.push(`/game/session/${session.sessionId}`);
            }
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
                    <h1 className={styles.pageTitle}>Rejoindre</h1>
                </div>


                {error && (
                    <div className="error-box">
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div className="text-center">
                        <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Entrez le code fourni par l&apos;hôte de la partie
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
                        style={{ width: '100%' }}
                    >
                        <div className="btn-primary">
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content">
                                {isLoading ? 'Connexion...' : 'Rejoindre la partie'}
                            </div>
                        </div>
                    </button>
                </div>

                {/* Back link */}
                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <button
                        onClick={() => router.push('/dashboard')}
                        style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}
                    >
                        ← Retour au tableau de bord
                    </button>
                </div>
            </div>
        </div>
    );
}

// Loading fallback for Suspense
function LoadingFallback() {
    return (
        <div className="container-center">
            <div className={styles.spinner} />
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function JoinGamePage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <JoinGameContent />
        </Suspense>
    );
}
