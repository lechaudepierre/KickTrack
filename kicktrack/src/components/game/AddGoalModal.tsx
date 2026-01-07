'use client';

import { useState } from 'react';
import { Player, GoalPosition, TeamColor } from '@/types';
import { Button } from '@/components/common/ui';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scorerId: string, scorerName: string, position: GoalPosition) => void;
    teamPlayers: Player[];
    teamName: string;
    teamColor: TeamColor;
}

const positions: { value: GoalPosition; label: string }[] = [
    { value: 'defense', label: 'Défense' },
    { value: 'midfield', label: 'Milieu' },
    { value: 'attack', label: 'Attaque' },
    { value: 'goalkeeper', label: 'Gardien' }
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
    const [selectedPosition, setSelectedPosition] = useState<GoalPosition>('attack');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedPlayer) return;
        onConfirm(selectedPlayer.userId, selectedPlayer.username, selectedPosition);
        setSelectedPlayer(null);
        setSelectedPosition('attack');
        onClose();
    };

    const getColorClasses = (color: TeamColor) => {
        switch (color) {
            case 'blue': return { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', ring: 'ring-blue-500', solid: 'bg-blue-500' };
            case 'red': return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', ring: 'ring-red-500', solid: 'bg-red-500' };
            case 'green': return { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500', solid: 'bg-emerald-500' };
            case 'yellow': return { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', ring: 'ring-yellow-500', solid: 'bg-yellow-500' };
            case 'orange': return { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', ring: 'ring-orange-500', solid: 'bg-orange-500' };
            case 'purple': return { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', ring: 'ring-purple-500', solid: 'bg-purple-500' };
            default: return { bg: 'bg-slate-500/20', border: 'border-slate-500', text: 'text-slate-400', ring: 'ring-slate-500', solid: 'bg-slate-500' };
        }
    };

    const colors = getColorClasses(teamColor);

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
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${colors.solid}`}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
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
