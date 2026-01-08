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

const TEAM_COLORS: { id: TeamColor; label: string; name: string }[] = [
    { id: 'red', label: 'Rouge', name: 'Équipe Rouge' },
    { id: 'blue', label: 'Bleu', name: 'Équipe Bleue' },
    { id: 'green', label: 'Vert', name: 'Équipe Verte' },
    { id: 'yellow', label: 'Jaune', name: 'Équipe Jaune' },
    { id: 'orange', label: 'Orange', name: 'Équipe Orange' },
    { id: 'purple', label: 'Violet', name: 'Équipe Violette' }
];

export default function TeamSetup({ players, format, onStartGame }: TeamSetupProps) {
    const [waitingPlayers, setWaitingPlayers] = useState<Player[]>([]);
    const [team1Players, setTeam1Players] = useState<Player[]>([]);
    const [team2Players, setTeam2Players] = useState<Player[]>([]);
    const [team1Color, setTeam1Color] = useState<TeamColor>('blue');
    const [team2Color, setTeam2Color] = useState<TeamColor>('red');
    const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
    const [dragSource, setDragSource] = useState<'waiting' | 'team1' | 'team2' | null>(null);

    // Initialize waiting list with all players
    useEffect(() => {
        if (players.length > 0) {
            if (format === '1v1' && players.length >= 2) {
                setTeam1Players([players[0]]);
                setTeam2Players([players[1]]);
                setWaitingPlayers(players.slice(2));
            } else {
                setWaitingPlayers(players);
                setTeam1Players([]);
                setTeam2Players([]);
            }
        }
    }, [players, format]);

    const handleDragStart = (player: Player, source: 'waiting' | 'team1' | 'team2') => {
        setDraggedPlayer(player);
        setDragSource(source);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (target: 'waiting' | 'team1' | 'team2') => {
        if (!draggedPlayer || !dragSource || dragSource === target) return;

        // Remove from source
        if (dragSource === 'waiting') {
            setWaitingPlayers(prev => prev.filter(p => p.userId !== draggedPlayer.userId));
        } else if (dragSource === 'team1') {
            setTeam1Players(prev => prev.filter(p => p.userId !== draggedPlayer.userId));
        } else if (dragSource === 'team2') {
            setTeam2Players(prev => prev.filter(p => p.userId !== draggedPlayer.userId));
        }

        // Add to target
        if (target === 'waiting') {
            setWaitingPlayers(prev => [...prev, draggedPlayer]);
        } else if (target === 'team1') {
            setTeam1Players(prev => [...prev, draggedPlayer]);
        } else if (target === 'team2') {
            setTeam2Players(prev => [...prev, draggedPlayer]);
        }

        setDraggedPlayer(null);
        setDragSource(null);
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

    const getTeamName = (color: TeamColor) => {
        return TEAM_COLORS.find(c => c.id === color)?.name || 'Équipe';
    };

    const renderTeamCard = (teamNum: 1 | 2, currentPlayers: Player[], color: TeamColor, setColor: (c: TeamColor) => void) => {
        const target = teamNum === 1 ? 'team1' : 'team2';
        const maxPlayers = format === '1v1' ? 1 : 2;
        const isFull = currentPlayers.length >= maxPlayers;

        return (
            <div
                className={`${styles.teamCard} ${styles[color]} ${draggedPlayer && !isFull ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => !isFull && handleDrop(target)}
            >
                <div className={styles.cardHeader}>
                    <h3 className={styles.teamName}>{getTeamName(color)}</h3>

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
                            className={`${styles.playerItem} ${draggedPlayer?.userId === player.userId ? styles.dragging : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(player, target)}
                            style={{ touchAction: 'none' }}
                        >
                            <div className={styles.playerAvatar}>
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.playerName}>{player.username}</span>
                        </div>
                    ))}
                    {currentPlayers.length === 0 && (
                        <div className={styles.emptyState}>
                            Glissez un joueur ici
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const isStartDisabled = () => {
        const requiredPlayers = format === '1v1' ? 1 : 2;
        return team1Players.length !== requiredPlayers ||
            team2Players.length !== requiredPlayers ||
            team1Color === team2Color;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Préparation des équipes</h2>
                <p className={styles.subtitle}>Glissez les joueurs dans leurs équipes</p>
            </div>

            {/* Waiting List */}
            <div
                className={`${styles.waitingListContainer} ${draggedPlayer && dragSource !== 'waiting' ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop('waiting')}
            >
                <h3 className={styles.waitingListTitle}>Liste d'attente</h3>
                <div className={styles.waitingPlayerList}>
                    {waitingPlayers.map(player => (
                        <div
                            key={player.userId}
                            className={`${styles.playerItem} ${draggedPlayer?.userId === player.userId ? styles.dragging : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(player, 'waiting')}
                            style={{ touchAction: 'none' }}
                        >
                            <div className={styles.playerAvatar}>
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.playerName}>{player.username}</span>
                        </div>
                    ))}
                    {waitingPlayers.length === 0 && (
                        <p className={styles.emptyWaitingList}>Tous les joueurs sont en place !</p>
                    )}
                </div>
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
                disabled={isStartDisabled()}
                className={styles.startButtonWrapper}
            >
                <div className={`btn-primary ${isStartDisabled() ? 'opacity-50' : ''}`}>
                    <div className="btn-primary-shadow" />
                    <div className="btn-primary-content">
                        {team1Color === team2Color ? 'Mêmes couleurs impossibles' :
                            (team1Players.length === 0 || team2Players.length === 0) ? 'Équipes incomplètes' :
                                'Lancer le match'}
                    </div>
                </div>
            </button>
        </div>
    );
}
