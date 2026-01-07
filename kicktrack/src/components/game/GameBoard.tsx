'use client';

import { Game, Team } from '@/types';
import { PlusIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
import GameTimer from './GameTimer';

interface GameBoardProps {
    game: Game;
    onAddGoal: (teamIndex: 0 | 1) => void;
    onPauseResume?: () => void;
}

export default function GameBoard({ game, onAddGoal, onPauseResume }: GameBoardProps) {
    const team1 = game.teams[0];
    const team2 = game.teams[1];

    const getTeamColor = (team: Team) => {
        switch (team.color) {
            case 'red': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', shadow: 'shadow-red-500/50' };
            case 'blue': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-500/50' };
            case 'green': return { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-500/50' };
            case 'yellow': return { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', shadow: 'shadow-yellow-500/50' };
            case 'orange': return { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', shadow: 'shadow-orange-500/50' };
            case 'purple': return { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', shadow: 'shadow-purple-500/50' };
            default: return { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-500', shadow: 'shadow-slate-500/50' };
        }
    };

    const t1Colors = getTeamColor(team1);
    const t2Colors = getTeamColor(team2);

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

            {/* Goal Buttons */}
            <div className="grid grid-cols-2 gap-6">
                <button
                    onClick={() => onAddGoal(0)}
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 ${t1Colors.border} bg-[#1E293B]`}
                >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${t1Colors.bg}`} />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`w-16 h-16 rounded-full ${t1Colors.bg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                            <PlusIcon className="w-8 h-8 text-white" />
                        </div>
                        <span className={`font-black text-xl uppercase tracking-wider ${t1Colors.text}`}>But Équipe 1</span>
                    </div>
                </button>

                <button
                    onClick={() => onAddGoal(1)}
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 ${t2Colors.border} bg-[#1E293B]`}
                >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${t2Colors.bg}`} />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`w-16 h-16 rounded-full ${t2Colors.bg} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                            <PlusIcon className="w-8 h-8 text-white" />
                        </div>
                        <span className={`font-black text-xl uppercase tracking-wider ${t2Colors.text}`}>But Équipe 2</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
