'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { subscribeToSession } from '@/lib/firebase/game-sessions';
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
    const { user, initialize } = useAuthStore();
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!sessionId) return;

        const unsubscribe = subscribeToSession(sessionId, (updatedSession) => {
            if (!updatedSession) {
                router.push('/dashboard');
                return;
            }

            setSession(updatedSession);
            setIsLoading(false);

            // If session becomes active, it means the game has started
            if (updatedSession.status === 'active' && updatedSession.gameId) {
                router.push(`/game/${updatedSession.gameId}`);
            }
        });

        return () => unsubscribe();
    }, [sessionId, router]);

    if (isLoading || !session) {
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
                <div className={styles.pageHeader}>
                    <button onClick={() => router.push('/dashboard')} className={styles.backButton}>
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>Salle d'attente</h1>
                </div>

                <div className="text-center mb-8">
                    <p className="text-secondary mb-2">Partie de {session.hostName}</p>
                    <p className="text-sm opacity-60">En attente du lancement par l'hôte...</p>
                </div>

                <PlayerList
                    players={session.players}
                    maxPlayers={session.maxPlayers}
                    currentUserId={user?.userId}
                />

                <div className="mt-12 text-center">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-secondary text-sm"
                    >
                        Quitter la salle
                    </button>
                </div>
            </div>
        </div>
    );
}
