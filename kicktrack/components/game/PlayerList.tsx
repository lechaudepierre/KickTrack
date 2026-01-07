'use client';

import { Player } from '@/types';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
    currentUserId?: string;
}

export default function PlayerList({ players, maxPlayers, currentUserId }: PlayerListProps) {
    const emptySlots = maxPlayers - players.length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Joueurs</span>
                <span className="text-emerald-400 font-medium">
                    {players.length}/{maxPlayers}
                </span>
            </div>

            <div className="space-y-2">
                {/* Joined players */}
                {players.map((player) => (
                    <div
                        key={player.userId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${player.userId === currentUserId
                                ? 'bg-emerald-500/20 border border-emerald-500/30'
                                : 'bg-slate-800/50 border border-slate-700/50'
                            }`}
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                            {player.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-white">
                                {player.username}
                                {player.userId === currentUserId && (
                                    <span className="text-emerald-400 text-sm ml-2">(vous)</span>
                                )}
                            </p>
                        </div>
                        <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                    </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="flex items-center gap-3 p-3 bg-slate-900/30 border border-dashed border-slate-700 rounded-xl"
                    >
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                            <ClockIcon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-500">En attente d&apos;un joueur...</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
