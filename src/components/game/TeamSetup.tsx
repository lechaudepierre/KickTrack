'use client';

import { useState, useEffect } from 'react';
import { Player, Team, TeamColor } from '@/types';
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

    // Selected player for click-to-assign functionality
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedSource, setSelectedSource] = useState<'waiting' | 'team1' | 'team2' | null>(null);

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

    // Handle player selection (click on player)
    const handlePlayerClick = (player: Player, source: 'waiting' | 'team1' | 'team2') => {
        if (selectedPlayer?.userId === player.userId) {
            // Deselect if clicking the same player
            setSelectedPlayer(null);
            setSelectedSource(null);
        } else {
            // Select the player
            setSelectedPlayer(player);
            setSelectedSource(source);
        }
    };

    // Handle team/zone click to assign selected player
    const handleZoneClick = (target: 'waiting' | 'team1' | 'team2') => {
        if (!selectedPlayer || !selectedSource || selectedSource === target) return;

        const maxPlayers = format === '1v1' ? 1 : 2;

        // Check if target team is full (except for waiting list)
        if (target === 'team1' && team1Players.length >= maxPlayers) return;
        if (target === 'team2' && team2Players.length >= maxPlayers) return;

        // Remove from source
        if (selectedSource === 'waiting') {
            setWaitingPlayers(prev => prev.filter(p => p.userId !== selectedPlayer.userId));
        } else if (selectedSource === 'team1') {
            setTeam1Players(prev => prev.filter(p => p.userId !== selectedPlayer.userId));
        } else if (selectedSource === 'team2') {
            setTeam2Players(prev => prev.filter(p => p.userId !== selectedPlayer.userId));
        }

        // Add to target
        if (target === 'waiting') {
            setWaitingPlayers(prev => [...prev, selectedPlayer]);
        } else if (target === 'team1') {
            setTeam1Players(prev => [...prev, selectedPlayer]);
        } else if (target === 'team2') {
            setTeam2Players(prev => [...prev, selectedPlayer]);
        }

        // Clear selection
        setSelectedPlayer(null);
        setSelectedSource(null);
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
        const canReceivePlayer = selectedPlayer && selectedSource !== target && !isFull;

        return (
            <div
                className={`${styles.teamCard} ${styles[color]} ${canReceivePlayer ? styles.dropZoneActive : ''}`}
                onClick={() => handleZoneClick(target)}
            >
                <div className={styles.cardHeader}>
                    <h3 className={styles.teamName}>{getTeamName(color)}</h3>

                    {/* Color Picker */}
                    <div className={styles.colorPicker}>
                        {TEAM_COLORS.map((c) => (
                            <button
                                key={c.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setColor(c.id);
                                }}
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
                            className={`${styles.playerItem} ${selectedPlayer?.userId === player.userId ? styles.selected : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlayerClick(player, target);
                            }}
                        >
                            <div className={styles.playerAvatar}>
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.playerName}>{player.username}</span>
                        </div>
                    ))}
                    {currentPlayers.length === 0 && (
                        <div className={styles.emptyState}>
                            {selectedPlayer ? 'Cliquez ici pour assigner' : 'Sélectionnez un joueur'}
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

    const canWaitingReceive = selectedPlayer && selectedSource !== 'waiting';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Préparation des équipes</h2>
                <p className={styles.subtitle}>
                    {selectedPlayer
                        ? `${selectedPlayer.username} sélectionné - Cliquez sur une équipe`
                        : 'Cliquez sur un joueur puis sur une équipe'}
                </p>
            </div>

            {/* Waiting List */}
            <div
                className={`${styles.waitingListContainer} ${canWaitingReceive ? styles.dropZoneActive : ''}`}
                onClick={() => handleZoneClick('waiting')}
            >
                <h3 className={styles.waitingListTitle}>Joueurs à assigner</h3>
                <div className={styles.waitingPlayerList}>
                    {waitingPlayers.map(player => (
                        <div
                            key={player.userId}
                            className={`${styles.playerItem} ${selectedPlayer?.userId === player.userId ? styles.selected : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlayerClick(player, 'waiting');
                            }}
                        >
                            <div className={styles.playerAvatar}>
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.playerName}>{player.username}</span>
                        </div>
                    ))}
                    {waitingPlayers.length === 0 && (
                        <p className={styles.emptyWaitingList}>Tous les joueurs sont assignés !</p>
                    )}
                </div>
            </div>

            <div className={styles.grid}>
                {renderTeamCard(1, team1Players, team1Color, setTeam1Color)}
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
