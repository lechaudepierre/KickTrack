'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { subscribeToSession, kickPlayerFromSession, cancelSession } from '@/lib/firebase/game-sessions';
import { GameSession } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import PlayerList from '@/components/game/PlayerList';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { useAuthStore } from '@/lib/stores/authStore';

export default function SessionWaitingPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;
    const { user, isLoading: authLoading, initialize } = useAuthStore();
    const [session, setSession] = useState<GameSession | null>(null);
    const [sessionLoading, setSessionLoading] = useState(true);
    // Keep a ref to always have latest session/user in the cleanup function
    const sessionRef = useRef<GameSession | null>(null);
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { sessionRef.current = session; }, [session]);

    const handleLeave = async () => {
        const s = sessionRef.current;
        const u = userRef.current;
        if (!s || !u) { router.push('/dashboard'); return; }
        try {
            if (u.userId === s.hostId) {
                // Host leaves → cancel session for everyone
                await cancelSession(s.sessionId);
            } else {
                // Player leaves → remove from session
                await kickPlayerFromSession(s.sessionId, u.userId);
            }
        } catch (err) {
            console.error('Erreur en quittant:', err);
        }
        router.push('/dashboard');
    };

    const handleKick = async (userId: string) => {
        if (!session) return;
        try {
            await kickPlayerFromSession(session.sessionId, userId);
        } catch (err) {
            console.error('Erreur kick:', err);
        }
    };

    useEffect(() => {
        const unsubscribe = initialize();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [initialize]);

    useEffect(() => {
        if (!sessionId) return;

        const unsubscribe = subscribeToSession(sessionId, (updatedSession) => {
            if (!updatedSession) {
                // Session deleted (host cancelled)
                router.push('/dashboard');
                return;
            }

            // Detect if current user was kicked
            const currentUser = userRef.current;
            if (currentUser && !updatedSession.players.some(p => p.userId === currentUser.userId)) {
                router.push('/dashboard');
                return;
            }

            setSession(updatedSession);
            setSessionLoading(false);

            // If session becomes active, it means the game has started
            if (updatedSession.status === 'active' && updatedSession.gameId) {
                router.push(`/game/${updatedSession.gameId}`);
            }
        });

        return () => unsubscribe();
    }, [sessionId, router]);

    if (authLoading || sessionLoading || !session) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    const isHost = user?.userId === session.hostId;

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />
            <div className={styles.contentWrapper}>
                <div className={styles.pageHeader}>
                    <button onClick={handleLeave} className={styles.backButton}>
                        <ArrowLeftIcon width={24} height={24} />
                    </button>
                    <h1 className={styles.pageTitle}>Salle d&apos;attente</h1>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <p className="text-secondary" style={{ marginBottom: 'var(--spacing-sm)' }}>Partie de {session.hostName}</p>
                    <p style={{ fontSize: 'var(--text-sm)', opacity: '0.6' }}>
                        {isHost ? 'Attendez que les joueurs rejoignent...' : "En attente du lancement par l'hôte..."}
                    </p>
                </div>

                <PlayerList players={session.players}
                    maxPlayers={session.maxPlayers}
                    currentUserId={user?.userId}
                    hostId={session.hostId}
                    onKick={isHost ? handleKick : undefined}
                />

                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <button onClick={handleLeave}
                        className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}
                    >
                        {isHost ? 'Annuler la partie' : 'Quitter la salle'}
                    </button>
                </div>
            </div>
        </div>
    );
}
