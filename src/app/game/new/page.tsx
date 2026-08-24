'use client';

import { toDate } from '@/lib/game/dates';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { createGameSession, subscribeToSession, cancelSession, startGame, kickPlayerFromSession, updateSessionExpiry } from '@/lib/firebase/game-sessions';
import TeamSetup from '@/components/game/TeamSetup';
import VenueDropdown from '@/components/venues/VenueDropdown';
import PinCodeDisplay from '@/components/game/PinCodeDisplay';
import PlayerList from '@/components/game/PlayerList';
import { Venue, GameFormat, GameSession, Team } from '@/types';
import { MODES, getMode, isNormalMode } from '@/lib/gamemodes/modes';
import ModeInfoModal, { ModeInfoButton } from '@/components/game/ModeInfoModal';
import type { GameMode } from '@/lib/gamemodes/types';
import { useFeature } from '@/lib/features';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    UserIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { Button, PageHeader } from '@/components/common/ui';

type Step = 'config' | 'waiting' | 'teams' | 'guest-teams';

export default function NewGamePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [step, setStep] = useState<Step>('config');
    const [format, setFormat] = useState<GameFormat>('1v1');
    const [modeId, setModeId] = useState('normal');
    const [infoMode, setInfoMode] = useState<GameMode | null>(null);
    // Les modes font partie de la V2 : masqués tant que le drop n'est pas fait.
    const v2Enabled = useFeature('v2');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Refs to track current values in cleanup (avoid stale closures)
    const sessionRef = useRef<GameSession | null>(null);
    const stepRef = useRef<Step>('config');
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { stepRef.current = step; }, [step]);

    /*
     * La liste « moi + les invités », posée UNE fois.
     *
     * Elle était écrite en toutes lettres dans le JSX, donc reconstruite à
     * chaque rendu. `TeamSetup` la recevait comme une liste toujours nouvelle
     * et remettait les équipes à zéro en boucle (chantier 9.46).
     */
    const joueursAvecInvites = useMemo(() => {
        if (!user) return [];
        const invite = (n: number) => ({
            userId: `guest_${user.userId}_${n}`,
            username: `Invité ${n}`,
            avatarUrl: null,
        });
        return [
            { userId: user.userId, username: user.username, avatarUrl: user.avatarUrl || null },
            ...(format === '1v1' ? [invite(1)] : [invite(1), invite(2), invite(3)]),
        ];
    }, [user, format]);

    // Cancel session if host navigates away without clicking the cancel button
    useEffect(() => {
        const cleanup = () => {
            if (stepRef.current === 'waiting' && sessionRef.current) {
                cancelSession(sessionRef.current.sessionId);
            }
        };

        // Handle browser tab close / page refresh
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            // Also clean up on in-app navigation (component unmount)
            cleanup();
        };
    }, []);

    // Heartbeat: keep session alive every 30s so it expires if host disconnects
    /*
     * On dépend de l'IDENTIFIANT de session, pas de l'objet.
     *
     * Lister `session` ferait boucler l'abonnement plus bas : il appelle
     * `setSession`, ce qui changerait la référence, ce qui relancerait
     * l'abonnement. L'identifiant, lui, ne change que si l'on change de
     * session — c'est exactement la condition qui doit relancer.
     */
    const sessionId = session?.sessionId;

    useEffect(() => {
        if (step !== 'waiting' || !sessionId) return;

        const interval = setInterval(() => {
            if (sessionRef.current) {
                updateSessionExpiry(sessionRef.current.sessionId).catch(() => {});
            }
        }, 30_000);

        return () => clearInterval(interval);
    }, [step, sessionId]);

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

    // Subscribe to session updates
    useEffect(() => {
        if (!sessionId) return;

        const unsubscribe = subscribeToSession(sessionId, (updatedSession) => {
            if (updatedSession) {
                setSession(updatedSession);
                // No auto-advance: host manually clicks "Lancer" when ready
            }
        });

        return () => unsubscribe();
    }, [sessionId]);

    const handleCreateSession = async () => {
        if (!user) return;

        setIsLoading(true);
        setError('');

        try {
            const newSession = await createGameSession(
                user.userId,
                user.username,
                selectedVenue?.venueId || 'none',
                selectedVenue?.name || 'Aucun',
                format,
                // On n'envoie jamais autre chose que ce qui est affiché : si le
                // sélecteur n'est pas visible, il vaut 'normal' de toute façon.
                modeId
            );
            setSession(newSession);
            setStep('waiting');
        } catch (err: unknown) {
            console.error('Error creating session:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        if (session) {
            await cancelSession(session.sessionId);
        }
        setSession(null);
        setStep('config');
    };

    const handleStartGame = async (teams: [Team, Team]) => {
        let sessionId = session?.sessionId;

        if (!sessionId && user) {
            try {
                const newSession = await createGameSession(
                    user.userId,
                    user.username,
                    selectedVenue?.venueId || 'none',
                    selectedVenue?.name || 'Aucun',
                    format,
                    // BUG CORRIGÉ : le mode était oublié sur ce chemin, donc une
                    // partie avec invités repartait toujours en Normal, même
                    // quand Bibitif était sélectionné.
                    modeId
                );
                sessionId = newSession.sessionId;
            } catch (err) {
                console.error('Error creating guest session:', err);
                setError('Erreur lors de la création de la session');
                return;
            }
        }

        if (!sessionId) return;

        try {
            const game = await startGame(sessionId, teams);
            router.push(`/game/${game.gameId}`);
        } catch (err) {
            console.error('Error starting game:', err);
            setError('Erreur lors du lancement de la partie');
        }
    };

    const handleExpired = () => {
        setError('Le code a expiré. Veuillez en générer un nouveau.');
        setSession(null);
        setStep('config');
    };

    const handleKickPlayer = async (targetUserId: string) => {
        if (!session) return;
        try {
            await kickPlayerFromSession(session.sessionId, targetUserId);
        } catch (err) {
            console.error('Error kicking player:', err);
        }
    };

    const handleGuestMode = () => {
        if (!user) return;
        setStep('guest-teams');
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
                {/* Le retour annule la session en cours si elle existe. Passé par
                    `onBack` et non par une action à droite : la flèche garde sa
                    position et sa taille standard, comme sur toutes les pages. */}
                <PageHeader title={step === 'config' ? 'Nouvelle Partie'
                        : step === 'waiting' ? 'En attente...'
                            : 'Équipes'}
                    onBack={() => step === 'config' ? router.back() : handleCancel()}
                />

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                {/* Step 1: Configuration */}
                {step === 'config' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Venue Selection */}
                        <div>
                            <label className={styles.fieldLabel}>Stade</label>
                            <VenueDropdown selectedVenue={selectedVenue}
                                onSelectVenue={setSelectedVenue}
                                showNoneOption={true}
                            />
                        </div>

                        {/* Mode de jeu — doc 33 : « Un mode se choisit au lancement de la partie ».
                            Placé ici, dans l'étape de configuration, avant que quiconque rejoigne. */}
                        {v2Enabled && (
                            <div>
                                <label className={styles.fieldLabel}>Mode de jeu</label>
                                <div className={styles.grid2}>
                                    {MODES.map(mode => (
                                        <div key={mode.id} style={{ position: 'relative' }}>
                                            <button onClick={() => setModeId(mode.id)}
                                                className={`${styles.selectionCard} ${modeId === mode.id ? styles.selectionCardActive : `${styles.selectionCardInactive}`}`}
                                                aria-pressed={modeId === mode.id}
                                                style={{ width: '100%' }}
                                            >
                                                <p style={{ fontWeight: 600 }}>{mode.name}</p>
                                            </button>
                                            <ModeInfoButton modeName={mode.name} onClick={() => setInfoMode(mode)} />
                                        </div>
                                    ))}
                                </div>
                                <p className={styles.fieldHint}>
                                    {MODES.find(m => m.id === modeId)?.description}
                                </p>
                            </div>
                        )}

                        {/* Format Selection */}
                        <div>
                            <label className={styles.fieldLabel}>Format de jeu</label>
                            <div className={styles.grid2}>
                                <button onClick={() => setFormat('1v1')}
                                    className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : `${styles.selectionCardInactive}`}`}
                                >
                                    <UserIcon style={{ height: '32px', width: '32px', margin: '0 auto', marginBottom: 'var(--spacing-sm)' }} />
                                    <p style={{ fontWeight: 600 }}>1 vs 1</p>
                                </button>
                                <button onClick={() => setFormat('2v2')}
                                    className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : `${styles.selectionCardInactive}`}`}
                                >
                                    <UsersIcon style={{ height: '32px', width: '32px', margin: '0 auto', marginBottom: 'var(--spacing-sm)' }} />
                                    <p style={{ fontWeight: 600 }}>2 vs 2</p>
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--spacing-lg)' }}>
                            <button onClick={handleCreateSession}
                                disabled={isLoading}
                                className={styles.mainButton}
                            >
                                {isLoading ? 'Création...' : 'Générer le code'}
                            </button>

                            <button onClick={handleGuestMode}
                                disabled={isLoading}
                                className={styles.secondaryTextButton}
                            >
                                Mode Invité
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Waiting for Players */}
                {step === 'waiting' && session && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2xl)' }}>
                        {!isNormalMode(session?.modeId) && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '8px 14px', borderRadius: '99px', border: '3px solid var(--ink-700)',
                                background: 'rgba(241,196,15,0.2)', marginBottom: 'var(--spacing-md)',
                            }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-dark)' }}>
                                    Mode {getMode(session?.modeId).name}
                                </span>
                            </div>
                        )}

                        <PinCodeDisplay pinCode={session.pinCode}
                            createdAt={toDate(session.createdAt)}
                            onExpired={handleExpired}
                        />

                        <PlayerList players={session.players}
                            maxPlayers={session.maxPlayers}
                            currentUserId={user?.userId}
                            onKick={handleKickPlayer}
                        />

                        {/* Launch button — only when lobby is full */}
                        {session.players.length >= session.maxPlayers && (
                            <Button onClick={() => setStep('teams')} fullWidth>
                                Lancer la partie
                            </Button>
                        )}

                        <Button onClick={handleCancel} variant="danger" fullWidth>
Annuler la partie
</Button>
                    </div>
                )}

                {/* Step 3: Team Setup */}
                {step === 'teams' && session && (
                    <TeamSetup players={session.players}
                        format={format}
                        onStartGame={handleStartGame}
                    />
                )}

                {/* Step 4: Guest Mode Team Setup */}
                {step === 'guest-teams' && user && (
                    <TeamSetup players={joueursAvecInvites}
                        format={format}
                        onStartGame={handleStartGame}
                    />
                )}
            </div>

            <ModeInfoModal mode={infoMode} onClose={() => setInfoMode(null)} />
        </div>
    );
}
