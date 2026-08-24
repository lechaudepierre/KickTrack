'use client';

import { useState, useEffect, Suspense, type CSSProperties } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    getTournament,
    createTournamentGame
} from '@/lib/firebase/tournaments';
import { Tournament, TournamentTeam } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { Button } from '@/components/common/ui';
import s from './page.module.css';

function MatchContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const tournamentId = params.id as string;
    const { user, initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState('');

    const matchId = searchParams.get('matchId');
    const team1Data = searchParams.get('team1');
    const team2Data = searchParams.get('team2');

    const team1: TournamentTeam | null = team1Data ? JSON.parse(team1Data) : null;
    const team2: TournamentTeam | null = team2Data ? JSON.parse(team2Data) : null;

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        const loadTournament = async () => {
            try {
                const t = await getTournament(tournamentId);
                setTournament(t);
            } catch (err) {
                console.error('Error loading tournament:', err);
                setError('Erreur lors du chargement');
            } finally {
                setIsLoading(false);
            }
        };

        if (tournamentId) {
            loadTournament();
        }
    }, [tournamentId]);

    const handleStartGame = async () => {
        if (!tournament || !matchId || !team1 || !team2) return;

        setIsStarting(true);
        setError('');

        try {
            const match = tournament.matches.find(m => m.matchId === matchId);
            if (!match) {
                throw new Error('Match non trouve');
            }

            const gameId = await createTournamentGame(tournament, match);
            router.push(`/game/${gameId}`);
        } catch (err) {
            console.error('Error starting game:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du lancement';
            setError(errorMessage);
            setIsStarting(false);
        }
    };

    const isHost = user?.userId === tournament?.hostId;

    if (isLoading) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    if (!tournament || !team1 || !team2) {
        return (
            <div className={styles.pageContainer}>
                <FieldBackground />
                <div className={styles.contentWrapper}>
                    <div className="error-box">
                        Donnees du match invalides
                    </div>
                    <button
                        onClick={() => router.push(`/tournament/${tournamentId}/live`)}
                        className={s.retour}
                    >
                        Retour au tournoi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <button onClick={() => router.push(`/tournament/${tournamentId}/live`)}
                        className={styles.backButton}
                    >
                        <ArrowLeftIcon width={24} height={24} />
                    </button>
                    <h1 className={styles.pageTitle}>Match</h1>
                </div>

                {error && (
                    <div className={`error-box ${s.errorBox}`}>
                        {error}
                    </div>
                )}

                {/* Match Preview */}
                <div className={s.preview}>
                    {[team1, team2].map((equipe, i) => (
                        <div key={equipe.teamId ?? i}>
                            <div className={`${s.team} ${i === 1 ? s.teamLast : ''}`}>
                                <div
                                    className={s.avatar}
                                    style={{ '--team-gradient': TEAM_GRADIENTS[i] } as CSSProperties}
                                >
                                    {equipe.name.charAt(0).toUpperCase()}
                                </div>
                                <p className={s.teamName}>{equipe.name}</p>
                                <p className={s.teamPlayers}>
                                    {equipe.players.map(j => j.username).join(' & ')}
                                </p>
                            </div>
                            {i === 0 && <div className={s.versus}>VS</div>}
                        </div>
                    ))}
                </div>

                {/* Match Info */}
                <div className={s.notice}>
                    <p className={s.noticeText}>
                        L&apos;hôte termine le match quand il le décide
                    </p>
                    {tournament.venueName !== 'Aucun' && (
                        <p className={s.noticeVenue}>{tournament.venueName}</p>
                    )}
                </div>

                {/* Start Button - Host only */}
                {isHost && (
                    <Button onClick={handleStartGame}
                        isLoading={isStarting}
                        variant="accent"
                        fullWidth
                    >
                        <PlayIcon width={24} height={24} />
                        {isStarting ? 'Lancement...' : 'Lancer le match'}
                    </Button>
                )}

                {/* Non-host message */}
                {!isHost && (
                    <div className={s.waiting}>
                        En attente que l&apos;organisateur lance le match...
                    </div>
                )}
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

/**
 * Dégradés des deux équipes d'un match.
 * Couleurs DÉCORATIVES, qui servent à distinguer les équipes entre elles.
 * Elles ne participent pas à la palette d'interface.
 */
const TEAM_GRADIENTS = [
    'linear-gradient(to bottom right, #E74C3C, #C0392B)',
    'linear-gradient(to bottom right, #3498DB, #2980B9)',
];

export default function TournamentMatchPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <MatchContent />
        </Suspense>
    );
}
