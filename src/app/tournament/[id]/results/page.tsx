'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getTournament } from '@/lib/firebase/tournaments';
import { Tournament } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    TrophyIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import s from './page.module.css';

export default function TournamentResultsPage() {
    const router = useRouter();
    const params = useParams();
    const tournamentId = params.id as string;
    const { initialize } = useAuthStore();

    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            } finally {
                setIsLoading(false);
            }
        };

        if (tournamentId) {
            loadTournament();
        }
    }, [tournamentId]);

    if (isLoading || !tournament) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    // Determine winner
    let winner = null;
    const finalStandings = tournament.standings || [];

    if (tournament.mode === 'round_robin' && tournament.standings && tournament.standings.length > 0) {
        winner = tournament.standings[0];
    } else if (tournament.mode === 'bracket' && tournament.bracket) {
        const finalRound = tournament.bracket[tournament.bracket.length - 1];
        if (finalRound && finalRound.matches.length > 0) {
            const finalMatch = finalRound.matches[0];
            if (finalMatch.winnerId) {
                const winnerTeam = tournament.teams.find(t => t.teamId === finalMatch.winnerId);
                if (winnerTeam) {
                    winner = {
                        teamId: winnerTeam.teamId,
                        teamName: winnerTeam.name,
                        players: winnerTeam.players,
                        played: 0,
                        wins: 0,
                        losses: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        points: 0
                    };
                }
            }
        }
    }

    // Calculate stats
    const totalMatches = tournament.matches.filter(m => m.status === 'completed').length;
    const totalGoals = tournament.matches.reduce((sum, m) => {
        if (m.score) return sum + m.score[0] + m.score[1];
        return sum;
    }, 0);
    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* ─── Le vainqueur ──────────────────────────────────────────── */}
                <div className={s.celebration}>
                    <div className={s.trophy}>
                        <TrophyIcon width={48} height={48} className={s.trophyIcon} />
                    </div>

                    <h1 className={s.title}>TOURNOI TERMINE</h1>

                    {winner && (
                        <div className={s.winnerCard}>
                            <p className={s.winnerLabel}>Vainqueur</p>
                            <p className={s.winnerName}>{winner.teamName}</p>
                            <p className={s.winnerPlayers}>
                                {winner.players.map(p => p.username).join(' & ')}
                            </p>
                        </div>
                    )}
                </div>

                {/* ─── Deux chiffres du tournoi ──────────────────────────────── */}
                <div className={s.statGrid}>
                    <div className={s.statCard}>
                        <p className={s.statValue}>{totalMatches}</p>
                        <p className={s.statLabel}>MATCHS</p>
                    </div>
                    <div className={s.statCard}>
                        <p className={s.statValue}>{totalGoals}</p>
                        <p className={s.statLabel}>BUTS</p>
                    </div>
                </div>

                {/* ─── Classement final ──────────────────────────────────────── */}
                {tournament.mode === 'round_robin' && finalStandings.length > 0 && (
                    <div className={s.section}>
                        <h2 className={s.sectionTitle}>Classement final</h2>
                        <div className={s.standings}>
                            {finalStandings.map((standing, index) => {
                                const medaille = index === 0 ? s.medalGold
                                    : index === 1 ? s.medalSilver
                                    : index === 2 ? s.medalBronze
                                    : '';
                                return (
                                    <div
                                        key={standing.teamId}
                                        className={`${s.standingRow} ${index === 0 ? s.standingRowWinner : ''}`}
                                    >
                                        <span className={`${s.medal} ${medaille}`}>{index + 1}</span>
                                        <div className={s.standingBody}>
                                            <p className={s.standingName}>{standing.teamName}</p>
                                            <p className={s.standingDetail}>
                                                {standing.wins}V - {standing.losses}D | {standing.goalsFor} buts
                                            </p>
                                        </div>
                                        <span className={s.standingPoints}>{standing.points} pts</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ─── Tableau final ─────────────────────────────────────────── */}
                {tournament.mode === 'bracket' && tournament.bracket && (
                    <div className={`${s.section} ${s.sectionScroll}`}>
                        <h2 className={s.sectionTitle}>Bracket final</h2>
                        <div className={s.bracketRounds}>
                            {tournament.bracket.map((round) => (
                                <div key={round.roundNumber} className={s.bracketRound}>
                                    <p className={s.roundName}>{round.roundName}</p>
                                    <div className={s.bracketColumn}>
                                        {round.matches.map((match) => {
                                            const exemption = match.status === 'bye';
                                            const gagnant1 = match.winnerId === match.team1.teamId;
                                            const gagnant2 = match.winnerId === match.team2.teamId;
                                            return (
                                                <div
                                                    key={match.matchId}
                                                    className={`${s.matchCard} ${exemption ? s.matchCardBye : ''}`}
                                                >
                                                    <div className={`${s.matchSide} ${s.matchSideTop}`}>
                                                        <span className={`${s.matchTeam} ${gagnant1 ? s.matchTeamWinner : ''}`}>
                                                            {match.team1.name || 'TBD'}
                                                        </span>
                                                        {match.score && (
                                                            <span className={s.matchScore}>{match.score[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className={s.matchSide}>
                                                        <span className={`${s.matchTeam} ${gagnant2 ? s.matchTeamWinner : ''}`}>
                                                            {exemption ? '-' : (match.team2.name || 'TBD')}
                                                        </span>
                                                        {match.score && (
                                                            <span className={s.matchScore}>{match.score[1]}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={() => router.push('/dashboard')} className={s.backButton}>
                    <HomeIcon width={20} height={20} />
                    Retour au tableau de bord
                </button>
            </div>
        </div>
    );
}
