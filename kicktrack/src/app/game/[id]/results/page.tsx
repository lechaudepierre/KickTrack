'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getGame } from '@/lib/firebase/games';
import { Game, Player, GoalPosition } from '@/types';
import { Button } from '@/components/common/ui';
import { FieldBackground } from '@/components/FieldDecorations';
import { TrophyIcon, HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

export default function GameResultsPage() {
    const router = useRouter();
    const params = useParams();
    const gameId = params.id as string;
    const { initialize } = useAuthStore();
    const [game, setGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initialize();
        loadGame();
    }, [gameId]);

    const loadGame = async () => {
        try {
            const gameData = await getGame(gameId);
            setGame(gameData);
        } catch (error) {
            console.error('Error loading game:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className={styles.spinner} />;
    if (!game) return <div>Partie introuvable</div>;

    const winnerIndex = game.winner;
    const isDraw = winnerIndex === undefined;
    const winningTeam = winnerIndex !== undefined ? game.teams[winnerIndex] : null;

    // Calculate MVP (simple version: most goals)
    const goalsByPlayer: Record<string, number> = {};
    game.goals.forEach(g => {
        goalsByPlayer[g.scoredBy] = (goalsByPlayer[g.scoredBy] || 0) + 1;
    });

    let mvpId = '';
    let maxGoals = -1;
    Object.entries(goalsByPlayer).forEach(([id, count]) => {
        if (count > maxGoals) {
            maxGoals = count;
            mvpId = id;
        }
    });

    // Find MVP player object
    let mvpPlayer: Player | undefined;
    game.teams.forEach(t => {
        const p = t.players.find(p => p.userId === mvpId);
        if (p) mvpPlayer = p;
    });

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />
            <div className={styles.contentWrapper}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">

                    {/* Trophy & Winner */}
                    <div className="animate-in zoom-in duration-500">
                        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isDraw ? 'bg-slate-700' :
                                winningTeam?.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-rose-500/20 text-rose-400'
                            }`}>
                            <TrophyIcon className="w-12 h-12" />
                        </div>

                        <h1 className="text-4xl font-black text-white mb-2">
                            {isDraw ? 'Match Nul !' : `Victoire ${winningTeam?.color === 'blue' ? 'Bleus' : 'Rouges'} !`}
                        </h1>
                        <p className="text-xl text-slate-400">
                            {game.score[0]} - {game.score[1]}
                        </p>
                    </div>

                    {/* MVP */}
                    {mvpPlayer && (
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 w-full max-w-sm">
                            <p className="text-sm text-slate-400 uppercase tracking-wider mb-4">Homme du match</p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-xl font-bold text-white">
                                    {mvpPlayer.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-lg text-white">{mvpPlayer.username}</p>
                                    <p className="text-amber-400">{maxGoals} buts</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 w-full max-w-sm">
                        <Button onClick={() => router.push('/game/new')}>
                            <ArrowPathIcon className="w-5 h-5 mr-2" />
                            Rejouer
                        </Button>
                        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                            <HomeIcon className="w-5 h-5 mr-2" />
                            Tableau de bord
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
