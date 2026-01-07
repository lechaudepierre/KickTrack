'use client';

import { useState } from 'react';
import { Player, GoalPosition } from '@/types';
import { Button } from '@/components/ui';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scorerId: string, scorerName: string, position: GoalPosition) => void;
    teamPlayers: Player[];
    teamName: string;
    teamColor: 'blue' | 'rose';
}

const positions: { value: GoalPosition; label: string }[] = [
    { value: 'defense', label: 'Défense' },
    { value: 'attack1', label: 'Attaque 1' },
    { value: 'attack2', label: 'Attaque 2' },
    { value: 'attack3', label: 'Attaque 3' }
];

export default function AddGoalModal({
    isOpen,
    onClose,
    onConfirm,
    teamPlayers,
    teamName,
    teamColor
}: AddGoalModalProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<GoalPosition>('attack1');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedPlayer) return;
        onConfirm(selectedPlayer.userId, selectedPlayer.username, selectedPosition);
        setSelectedPlayer(null);
        setSelectedPosition('attack1');
        onClose();
    };

    const colorClasses = {
        blue: {
            bg: 'bg-blue-500/20',
            border: 'border-blue-500',
            text: 'text-blue-400',
            ring: 'ring-blue-500'
        },
        rose: {
            bg: 'bg-rose-500/20',
            border: 'border-rose-500',
            text: 'text-rose-400',
            ring: 'ring-rose-500'
        }
    };

    const colors = colorClasses[teamColor];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md max-h-[85vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b border-slate-800 ${colors.bg}`}>
                    <h3 className={`text-lg font-semibold ${colors.text}`}>
                        But pour {teamName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Player Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-3">
                            Qui a marqué ?
                        </label>
                        <div className="space-y-2">
                            {teamPlayers.map((player) => (
                                <button
                                    key={player.userId}
                                    onClick={() => setSelectedPlayer(player)}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedPlayer?.userId === player.userId
                                            ? `${colors.bg} ${colors.border}`
                                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${teamColor === 'blue' ? 'bg-blue-500' : 'bg-rose-500'
                                        }`}>
                                        {player.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`font-medium ${selectedPlayer?.userId === player.userId ? colors.text : 'text-white'
                                        }`}>
                                        {player.username}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Position Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-3">
                            Position du but
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {positions.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setSelectedPosition(value)}
                                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${selectedPosition === value
                                            ? `${colors.bg} ${colors.border} ${colors.text}`
                                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 flex gap-3">
                    <Button variant="secondary" fullWidth onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        fullWidth
                        onClick={handleConfirm}
                        disabled={!selectedPlayer}
                    >
                        Valider
                    </Button>
                </div>
            </div>
        </div>
    );
}
