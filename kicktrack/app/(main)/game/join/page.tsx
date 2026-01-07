'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/authStore';
import { getSessionByPinCode, joinGameSession } from '@/lib/firebase/game-sessions';
import { formatPinCode, validatePinCode } from '@/lib/utils/code-generator';
import {
    ArrowLeftIcon,
    QrCodeIcon,
    KeyIcon
} from '@heroicons/react/24/outline';

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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="p-6 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">Rejoindre</h1>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6">
                    <button
                        onClick={() => setMode('code')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${mode === 'code'
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <KeyIcon className="h-5 w-5" />
                        Code PIN
                    </button>
                    <button
                        onClick={() => setMode('scan')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${mode === 'scan'
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <QrCodeIcon className="h-5 w-5" />
                        Scanner
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                        {error}
                    </div>
                )}

                {mode === 'code' ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-slate-400 mb-6">
                                Entrez le code fourni par l&apos;hôte de la partie
                            </p>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={pinCode}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="ABC-123"
                                    maxLength={7}
                                    className="w-full text-center text-4xl font-mono font-bold tracking-[0.3em] py-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-emerald-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                                />
                            </div>
                        </div>

                        <Button
                            fullWidth
                            onClick={() => handleJoin()}
                            isLoading={isLoading}
                            disabled={pinCode.length < 7}
                        >
                            Rejoindre la partie
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-slate-400 mb-6">
                                Scannez le QR code affiché sur l&apos;écran de l&apos;hôte
                            </p>

                            <div className="aspect-square max-w-xs mx-auto bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-2xl flex items-center justify-center">
                                <div className="text-center p-6">
                                    <QrCodeIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-500 text-sm">
                                        Scanner QR en cours de développement
                                    </p>
                                    <p className="text-slate-600 text-xs mt-2">
                                        Utilisez le code PIN pour l&apos;instant
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Back link */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
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
