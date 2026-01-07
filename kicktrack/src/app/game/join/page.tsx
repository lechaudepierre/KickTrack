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
    QrCodeIcon,
    KeyIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

type JoinMode = 'scan' | 'code';

function JoinGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [mode, setMode] = useState<JoinMode>('code');
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
            router.push('/login');
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
            if (session.status === 'started') {
                router.push('/dashboard');
            } else {
                router.push('/dashboard');
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

                {/* Mode Toggle */}
                <div style={{ display: 'flex', background: 'var(--color-pitch-medium)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }}>
                    <button
                        onClick={() => setMode('code')}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            background: mode === 'code' ? 'var(--color-field-green)' : 'transparent',
                            color: mode === 'code' ? 'var(--color-pitch-navy)' : 'var(--color-text-secondary)',
                            boxShadow: mode === 'code' ? 'var(--shadow-soft)' : 'none'
                        }}
                    >
                        <KeyIcon className="h-5 w-5" />
                        Code PIN
                    </button>
                    <button
                        onClick={() => setMode('scan')}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            background: mode === 'scan' ? 'var(--color-field-green)' : 'transparent',
                            color: mode === 'scan' ? 'var(--color-pitch-navy)' : 'var(--color-text-secondary)',
                            boxShadow: mode === 'scan' ? 'var(--shadow-soft)' : 'none'
                        }}
                    >
                        <QrCodeIcon className="h-5 w-5" />
                        Scanner
                    </button>
                </div>

                {error && (
                    <div className="error-box">
                        {error}
                    </div>
                )}

                {mode === 'code' ? (
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
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        <div className="text-center">
                            <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                Scannez le QR code affiché sur l&apos;écran de l&apos;hôte
                            </p>

                            <div style={{
                                maxWidth: '20rem',
                                margin: '0 auto',
                                aspectRatio: '1/1',
                                background: 'var(--color-pitch-medium)',
                                border: '2px dashed rgba(255,255,255,0.2)',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div className="text-center p-6">
                                    <QrCodeIcon className="h-16 w-16 text-[var(--color-text-muted)] mx-auto mb-4" />
                                    <p className="text-secondary text-sm">
                                        Scanner QR en cours de développement
                                    </p>
                                    <p className="text-[var(--color-text-muted)] text-xs mt-2">
                                        Utilisez le code PIN pour l&apos;instant
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
