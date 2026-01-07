import { useState } from 'react';
import { Game, Team, Player, GoalPosition } from '@/types';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import GameTimer from './GameTimer';

interface GameBoardProps {
    game: Game;
    onAddGoal: (teamIndex: 0 | 1, scorerId: string, scorerName: string, position: GoalPosition) => void;
    onPauseResume?: () => void;
}

const positions: { value: GoalPosition; label: string }[] = [
    { value: 'defense', label: 'Défense' },
    { value: 'midfield', label: 'Milieu' },
    { value: 'attack', label: 'Attaque' },
    { value: 'goalkeeper', label: 'Gardien' }
];

export default function GameBoard({ game, onAddGoal, onPauseResume }: GameBoardProps) {
    const team1 = game.teams[0];
    const team2 = game.teams[1];

    // State for inline goal input
    const [activeTeamIndex, setActiveTeamIndex] = useState<0 | 1 | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const getTeamColor = (team: Team) => {
        switch (team.color) {
            case 'red': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', shadow: 'shadow-red-500/50', light: 'bg-red-500/20' };
            case 'blue': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-500/50', light: 'bg-blue-500/20' };
            case 'green': return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-500/50', light: 'bg-emerald-500/20' };
            case 'yellow': return { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', shadow: 'shadow-yellow-500/50', light: 'bg-yellow-500/20' };
            case 'orange': return { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', shadow: 'shadow-orange-500/50', light: 'bg-orange-500/20' };
            case 'purple': return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', shadow: 'shadow-purple-500/50', light: 'bg-purple-500/20' };
            default: return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500', shadow: 'shadow-slate-500/50', light: 'bg-slate-500/20' };
        }
    };

    const t1Colors = getTeamColor(team1);
    const t2Colors = getTeamColor(team2);

    const handleStartAddGoal = (teamIndex: 0 | 1) => {
        const team = game.teams[teamIndex];
        setActiveTeamIndex(teamIndex);

        // Auto-select player if 1v1
        if (team.players.length === 1) {
            setSelectedPlayer(team.players[0]);
        } else {
            setSelectedPlayer(null);
        }
    };

    const handleCancel = () => {
        setActiveTeamIndex(null);
        setSelectedPlayer(null);
    };

    const handleSelectPlayer = (player: Player) => {
        setSelectedPlayer(player);
    };

    const handleSelectPosition = (position: GoalPosition) => {
        if (activeTeamIndex !== null && selectedPlayer) {
            onAddGoal(activeTeamIndex, selectedPlayer.userId, selectedPlayer.username, position);
            // Reset state
            setActiveTeamIndex(null);
            setSelectedPlayer(null);
        }
    };

    const renderGoalInput = (teamIndex: 0 | 1, colors: any) => {
        const team = game.teams[teamIndex];
        const is1v1 = team.players.length === 1;

        return (
            <div className={`col-span-2 sm:col-span-1 bg-[#1E293B] border-2 ${colors.border} rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                <div className={`p-3 flex items-center justify-between ${colors.light} border-b ${colors.border}`}>
                    <span className={`font-bold ${colors.text}`}>
                        {selectedPlayer ? 'Comment ?' : 'Qui ?'}
                    </span>
                    <button onClick={handleCancel} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className={`w-5 h-5 ${colors.text}`} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Step 1: Player Selection (if not 1v1 or not selected) */}
                    {!selectedPlayer && (
                        <div className="grid grid-cols-2 gap-2">
                            {team.players.map(player => (
                                <button
                                    key={player.userId}
                                    onClick={() => handleSelectPlayer(player)}
                                    className="flex items-center gap-2 p-2 rounded-xl bg-[#0F172A] hover:bg-[#334155] transition-colors border border-[#334155]"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${colors.bg}`}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm font-medium text-white truncate">{player.username}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Position Selection (if player selected) */}
                    {selectedPlayer && (
                        <div className="grid grid-cols-2 gap-2">
                            {positions.map(pos => (
                                <button
                                    key={pos.value}
                                    onClick={() => handleSelectPosition(pos.value)}
                                    className={`p-3 rounded-xl border border-[#334155] bg-[#0F172A] hover:bg-[#334155] transition-all text-sm font-medium text-slate-300 hover:text-white hover:border-${colors.bg.split('-')[1]}-500`}
                                >
                                    {pos.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
            {/* Score Board */}
            <div className="relative bg-[#1E293B]/80 backdrop-blur-md border border-[#334155] rounded-3xl p-8 shadow-2xl overflow-hidden">
                {/* Background Accents */}
                <div className={`absolute top-0 left-0 w-1/2 h-1 bg-gradient-to-r from-transparent to-${t1Colors.bg.split('-')[1]}-500 opacity-50`} />
                <div className={`absolute top-0 right-0 w-1/2 h-1 bg-gradient-to-l from-transparent to-${t2Colors.bg.split('-')[1]}-500 opacity-50`} />

                <div className="flex items-center justify-between relative z-10">
                    {/* Team 1 Score */}
                    <div className="flex-1 text-center">
                        <div className={`text-7xl font-black ${t1Colors.text} mb-2 drop-shadow-lg`}>
                            {game.score[0]}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex -space-x-2">
                                {team1.players.map((player) => (
                                    <div key={player.userId} className={`w-8 h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center text-xs font-bold text-white ${t1Colors.bg}`}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[#94A3B8] text-sm font-medium uppercase tracking-wide">Équipe 1</span>
                        </div>
                    </div>

                    {/* Timer & Info */}
                    <div className="flex flex-col items-center px-8">
                        <div className="bg-[#0F172A] rounded-full px-6 py-2 border border-[#334155] mb-4 shadow-inner">
                            <GameTimer startedAt={game.startTime} />
                        </div>
                        <div className="text-[#64748B] font-bold text-xl">VS</div>
                        {game.multiplier > 1 && (
                            <div className="mt-2 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full text-white text-xs font-black animate-pulse shadow-lg shadow-orange-500/20">
                                {game.multiplier}x POINTS
                            </div>
                        )}
                    </div>

                    {/* Team 2 Score */}
                    <div className="flex-1 text-center">
                        <div className={`text-7xl font-black ${t2Colors.text} mb-2 drop-shadow-lg`}>
                            {game.score[1]}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex -space-x-2">
                                {team2.players.map((player) => (
                                    <div key={player.userId} className={`w-8 h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center text-xs font-bold text-white ${t2Colors.bg}`}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[#94A3B8] text-sm font-medium uppercase tracking-wide">Équipe 2</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Goal Controls */}
            <div className="grid grid-cols-2 gap-6">
                {activeTeamIndex === 0 ? (
                    renderGoalInput(0, t1Colors)
                ) : (
                    <button
                        onClick={() => handleStartAddGoal(0)}
                        disabled={activeTeamIndex !== null}
                        className={`group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 ${t1Colors.border} bg-[#1E293B] ${activeTeamIndex !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${t1Colors.bg}`} />
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-16 h-16 rounded-full ${t1Colors.bg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                                <PlusIcon className="w-8 h-8 text-white" />
                            </div>
                            <span className={`font-black text-xl uppercase tracking-wider ${t1Colors.text}`}>But Équipe 1</span>
                        </div>
                    </button>
                )}

                {activeTeamIndex === 1 ? (
                    renderGoalInput(1, t2Colors)
                ) : (
                    <button
                        onClick={() => handleStartAddGoal(1)}
                        disabled={activeTeamIndex !== null}
                        className={`group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 ${t2Colors.border} bg-[#1E293B] ${activeTeamIndex !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${t2Colors.bg}`} />
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-16 h-16 rounded-full ${t2Colors.bg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                                <PlusIcon className="w-8 h-8 text-white" />
                            </div>
                            <span className={`font-black text-xl uppercase tracking-wider ${t2Colors.text}`}>But Équipe 2</span>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
