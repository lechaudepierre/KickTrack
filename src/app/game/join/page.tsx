'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getSessionByPinCode, joinGameSession, subscribeToActiveSessions } from '@/lib/firebase/game-sessions';
import { getTournamentByPinCode, joinTournament } from '@/lib/firebase/tournaments';
import { formatPinCode, validatePinCode } from '@/lib/utils/code-generator';
import { getMode, isNormalMode } from '@/lib/gamemodes/modes';
import { FieldBackground } from '@/components/FieldDecorations';
import { GameSession } from '@/types';
import RankAvatar from '@/components/common/RankAvatar';
import {
    MapPinIcon,
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { PageHeader, Button } from '@/components/common/ui';


function JoinGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
    const [activeSessions, setActiveSessions] = useState<GameSession[]>([]);
    const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);

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

    // Real-time subscription to active sessions
    useEffect(() => {
        const unsubscribe = subscribeToActiveSessions((sessions) => {
            // Exclude sessions where the current user is already the host
            setActiveSessions(sessions.filter(s => s.hostId !== user?.userId));
        });
        return () => unsubscribe();
    }, [user?.userId]);

    /*
     * Rejoindre automatiquement depuis un lien ou un QR code.
     *
     * Le garde n'est pas une précaution de style : sans lui, cet effet
     * rejoindrait DEUX FOIS si React le rejouait — ce qu'il fait en mode strict
     * au développement, et à chaque rendu si l'on listait `handleJoin` dans les
     * dépendances, puisque cette fonction est recréée à chaque fois.
     *
     * Un code se rejoint une fois. C'est ce que dit le garde, et c'est pour ça
     * que `handleJoin` reste volontairement hors des dépendances.
     */
    const codeTraite = useRef<string | null>(null);
    useEffect(() => {
        const code = searchParams.get('code');
        if (!code || codeTraite.current === code) return;
        codeTraite.current = code;
        setPinCode(code);
        handleJoin(code);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- voir ci-dessus
    }, [searchParams]);

    const handleCodeChange = (value: string) => {
        const formatted = formatPinCode(value);
        setPinCode(formatted);
    };

    const handleJoinBySession = async (session: GameSession) => {
        if (!user || joiningSessionId) return;
        setJoiningSessionId(session.sessionId);
        try {
            await joinGameSession(session.sessionId, {
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl
            });
            if (session.status === 'active' && session.gameId) {
                router.push(`/game/${session.gameId}`);
            } else {
                router.push(`/game/session/${session.sessionId}`);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erreur lors de la connexion';
            setError(msg);
        } finally {
            setJoiningSessionId(null);
        }
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
            // First, try to find a game session with this code
            const session = await getSessionByPinCode(codeToUse);

            if (session) {
                // It's a game session
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
                return;
            }

            // If no session found, try to find a tournament
            const tournament = await getTournamentByPinCode(codeToUse);

            if (tournament) {
                // It's a tournament
                if (tournament.status !== 'waiting' && tournament.status !== 'team_setup') {
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
                return;
            }

            // Neither session nor tournament found
            setError('Code invalide ou session expiree');
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
                <PageHeader title="Rejoindre" />


                {error && (
                    <div className="error-box">
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p className="text-secondary" style={{ marginBottom: 'var(--spacing-lg)' }}>
                            Entrez le code fourni par l&apos;hote
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
                        fullWidth
                    >
                        {isLoading ? 'Connexion...' : 'Rejoindre'}
                    </Button>
                </div>

                {/* Active sessions list */}
                {activeSessions.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-2xl)' }}>
                        <p style={{
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'rgba(255,255,255,0.5)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            Parties en cours ({activeSessions.length})
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {activeSessions.map((session) => {
                                const isFull = session.players.length >= session.maxPlayers;
                                const isAlreadyIn = session.players.some(p => p.userId === user?.userId);
                                const isJoining = joiningSessionId === session.sessionId;

                                return (
                                    <div key={session.sessionId}
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '3px solid var(--ink-700)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: 'var(--spacing-md)',
                                            boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--spacing-sm)',
                                        }}
                                    >
                                        {/* Top row: venue + format badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <MapPinIcon style={{ width: '0.875rem', height: '0.875rem', color: 'rgba(51,51,51,0.4)', flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text-dark)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                                                    {session.venueName}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 900,
                                                padding: '2px 8px',
                                                borderRadius: '99px',
                                                border: '2px solid var(--ink-700)',
                                                background: session.format === '2v2' ? 'rgba(75,123,255,0.12)' : 'rgba(46,204,113,0.12)',
                                                color: session.format === '2v2' ? 'var(--team-blue)' : 'var(--team-green)',
                                                textTransform: 'uppercase',
                                            }}>
                                                {session.format}
                                            </span>
                                        </div>

                                        {/* Mode de jeu — doc 33 / chantier 7.2.
                                            Rejoindre sans savoir qu'on joue en bibitif serait
                                            déloyal : le mode doit être lisible AVANT d'accepter.
                                            Le mode normal n'affiche rien, c'est le défaut. */}
                                        {!isNormalMode(session.modeId) && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                marginBottom: 'var(--spacing-sm)',
                                                padding: '4px 10px',
                                                borderRadius: '99px',
                                                border: '2px solid var(--ink-700)',
                                                background: 'rgba(241,196,15,0.18)',
                                                alignSelf: 'flex-start',
                                            }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-dark)', textTransform: 'uppercase' }}>
                                                    Mode {getMode(session.modeId).name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Players row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                            {session.players.map((p) => (
                                                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <RankAvatar size="xs" />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>
                                                        {p.username}
                                                    </span>
                                                </div>
                                            ))}
                                            {Array.from({ length: session.maxPlayers - session.players.length }).map((_, i) => (
                                                <div key={`empty-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', opacity: 0.3 }}>
                                                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: '2px dashed var(--ink-700)' }} />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dark)' }}>libre</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Join button */}
                                        <button onClick={() => handleJoinBySession(session)}
                                            disabled={isFull || isAlreadyIn || !!joiningSessionId}
                                            style={{
                                                width: '100%',
                                                padding: '0.6rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '3px solid var(--ink-700)',
                                                fontWeight: 900,
                                                fontSize: '0.8rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                                cursor: isFull || isAlreadyIn ? 'not-allowed' : 'pointer',
                                                background: isAlreadyIn ? 'rgba(46,204,113,0.15)' : isFull ? 'rgba(51,51,51,0.08)' : 'var(--green-600)',
                                                color: isAlreadyIn ? 'var(--team-green)' : isFull ? 'rgba(51,51,51,0.4)' : 'white',
                                                boxShadow: isFull || isAlreadyIn ? 'none' : '0 3px 0 var(--ink-700)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {isJoining ? 'Connexion...' : isAlreadyIn ? 'Déjà rejoint' : isFull ? 'Complet' : 'Rejoindre'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

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
