'use client';

import { useState, useEffect } from 'react';
import { Player, Team, TeamColor } from '@/types';
import { UserIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface TeamSetupProps {
    players: Player[];
    format: '1v1' | '2v2';
    onStartGame: (teams: [Team, Team]) => void;
}

const TEAM_COLORS: { id: TeamColor; hex: string; label: string }[] = [
    { id: 'red', hex: '#EF4444', label: 'Rouge' },
    { id: 'blue', hex: '#3B82F6', label: 'Bleu' },
    { id: 'green', hex: '#10B981', label: 'Vert' },
    { id: 'yellow', hex: '#F59E0B', label: 'Jaune' },
    { id: 'orange', hex: '#F97316', label: 'Orange' },
    { id: 'purple', hex: '#A855F7', label: 'Violet' }
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
        const teamColorObj = TEAM_COLORS.find(c => c.id === color)!;

        return (
            <div
                className="bg-[#1E293B] border-4 rounded-xl p-4 transition-colors"
                style={{ borderColor: teamColorObj.hex }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-white uppercase tracking-wider">Équipe {teamNum}</h3>

                    {/* Color Picker */}
                    <div className="flex gap-1">
                        {TEAM_COLORS.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setColor(c.id)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c.id ? 'scale-110 border-white' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    {currentPlayers.map((player) => (
                        <div
                            key={player.userId}
                            className="flex items-center gap-3 p-3 bg-[#0F172A] rounded-lg border border-[#334155]"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-white font-bold text-xs">
                                {player.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white font-medium truncate flex-1">{player.username}</span>
                            <button
                                onClick={() => handleSwapPlayer(player, teamNum)}
                                className="text-[#94A3B8] hover:text-white text-xs font-bold uppercase"
                            >
                                Changer
                            </button>
                        </div>
                    ))}
                    {currentPlayers.length === 0 && (
                        <div className="p-4 text-center text-[#94A3B8] text-sm italic border border-dashed border-[#334155] rounded-lg">
                            Aucun joueur
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h2 className="text-2xl font-black text-white mb-2">Préparation des équipes</h2>
                <p className="text-[#94A3B8]">Choisissez vos couleurs et vos coéquipiers</p>
            </div>

            <div className="grid gap-6">
                {renderTeamCard(1, team1Players, team1Color, setTeam1Color)}

                <div className="flex justify-center items-center">
                    <div className="w-10 h-10 rounded-full bg-[#0F172A] border-2 border-[#334155] flex items-center justify-center text-[#94A3B8] font-black text-xs z-10">
                        VS
                    </div>
                </div>

                {renderTeamCard(2, team2Players, team2Color, setTeam2Color)}
            </div>

            <button
                onClick={handleStart}
                disabled={team1Color === team2Color}
                className="w-full mt-4"
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
