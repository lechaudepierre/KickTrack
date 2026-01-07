'use client';

import { useState, useEffect } from 'react';
import { Player, Team, TeamColor } from '@/types';
import { UserIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import styles from './TeamSetup.module.css';

interface TeamSetupProps {
    players: Player[];
    format: '1v1' | '2v2';
    onStartGame: (teams: [Team, Team]) => void;
}

const TEAM_COLORS: { id: TeamColor; label: string }[] = [
    { id: 'red', label: 'Rouge' },
    { id: 'blue', label: 'Bleu' },
    { id: 'green', label: 'Vert' },
    { id: 'yellow', label: 'Jaune' },
    { id: 'orange', label: 'Orange' },
    { id: 'purple', label: 'Violet' }
];

export default function TeamSetup({ players, format, onStartGame }: TeamSetupProps) {
    const [team1Players, setTeam1Players] = useState<Player[]>([]);
    const [team2Players, setTeam2Players] = useState<Player[]>([]);
    const [team1Color, setTeam1Color] = useState<TeamColor>('blue');
    const [team2Color, setTeam2Color] = useState<TeamColor>('red');

    // Initialize teams based on players
    useEffect(() => {
        if (players.length > 0) {
            if (format === '1v1') {
                setTeam1Players([players[0]]);
                if (players.length > 1) setTeam2Players([players[1]]);
            } else {
                // 2v2 distribution
                setTeam1Players(players.slice(0, 2));
                setTeam2Players(players.slice(2, 4));
            }
        }
    }, [players, format]);

    const handleSwapPlayer = (player: Player, currentTeam: 1 | 2) => {
        if (format === '1v1') {
            // Swap the two players
            const t1 = team1Players[0];
            const t2 = team2Players[0];
            setTeam1Players([t2]);
            setTeam2Players([t1]);
        } else {
            // For 2v2, move player to other team if space available or swap
            if (currentTeam === 1) {
                const newT1 = team1Players.filter(p => p.userId !== player.userId);
                const newT2 = [...team2Players, player];

                // If teams become unbalanced (0 vs 4 or 1 vs 3), we might need logic to force balance
                // But for simplicity, let's just swap with the first player of the other team
                const playerToSwap = team2Players[0];
                const newT2Swapped = [player, ...team2Players.slice(1)];
                const newT1Swapped = [...team1Players.filter(p => p.userId !== player.userId), playerToSwap];

                setTeam1Players(newT1Swapped);
                setTeam2Players(newT2Swapped);
            } else {
                const playerToSwap = team1Players[0];
                const newT1Swapped = [player, ...team1Players.slice(1)];
                const newT2Swapped = [...team2Players.filter(p => p.userId !== player.userId), playerToSwap];

                setTeam1Players(newT1Swapped);
                setTeam2Players(newT2Swapped);
            }
        }
    };

    const handleStart = () => {
        const team1: Team = {
            players: team1Players,
            color: team1Color,
            score: 0
        };

        const team2: Team = {
            players: team2Players,
            color: team2Color,
            score: 0
        };

        onStartGame([team1, team2]);
    };

    const renderTeamCard = (teamNum: 1 | 2, currentPlayers: Player[], color: TeamColor, setColor: (c: TeamColor) => void) => {
        return (
            <div className={`${styles.teamCard} ${styles[color]}`}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.teamName}>Équipe {teamNum}</h3>

                    {/* Color Picker */}
                    <div className={styles.colorPicker}>
                        {TEAM_COLORS.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setColor(c.id)}
                                className={`${styles.colorButton} ${styles[c.id]} ${color === c.id ? styles.colorButtonActive : ''}`}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                <div className={styles.playerList}>
                    {currentPlayers.map((player) => (
                        <div
                            key={player.userId}
                            className={styles.playerItem}
                        >
                            <div className={styles.playerAvatar}>
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.playerName}>{player.username}</span>
                            <button
                                onClick={() => handleSwapPlayer(player, teamNum)}
                                className={styles.swapButton}
                            >
                                Changer
                            </button>
                        </div>
                    ))}
                    {currentPlayers.length === 0 && (
                        <div className={styles.emptyState}>
                            Aucun joueur
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Préparation des équipes</h2>
                <p className={styles.subtitle}>Choisissez vos couleurs et vos coéquipiers</p>
            </div>

            <div className={styles.grid}>
                {renderTeamCard(1, team1Players, team1Color, setTeam1Color)}

                <div className={styles.vsContainer}>
                    <div className={styles.vsCircle}>
                        VS
                    </div>
                </div>

                {renderTeamCard(2, team2Players, team2Color, setTeam2Color)}
            </div>

            <button
                onClick={handleStart}
                disabled={team1Color === team2Color}
                className={styles.startButtonWrapper}
            >
                <div className="btn-primary">
                    <div className="btn-primary-shadow" />
                    <div className="btn-primary-content">
                        {team1Color === team2Color ? 'Mêmes couleurs impossibles' : 'Lancer le match'}
                    </div>
                </div>
            </button>
        </div>
    );
}
