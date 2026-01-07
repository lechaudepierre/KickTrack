'use client';

import { Goal, GoalPosition } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GoalTimelineProps {
    goals: Goal[];
    onRemoveGoal?: (goalId: string) => void;
    canRemove?: boolean;
}

const positionLabels: Record<GoalPosition, string> = {
    defense: 'Défense',
    attack1: 'Attaque 1',
    attack2: 'Attaque 2',
    attack3: 'Attaque 3'
};

export default function GoalTimeline({ goals, onRemoveGoal, canRemove = false }: GoalTimelineProps) {
    if (goals.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                Aucun but pour le moment
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...goals].reverse().map((goal, index) => {
                const isLastGoal = index === 0;
                const goalTime = goal.timestamp instanceof Date
                    ? goal.timestamp
                    : new Date(goal.timestamp);

                return (
                    <div
                        key={goal.goalId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${goal.teamIndex === 0
                                ? 'bg-blue-500/10 border border-blue-500/20'
                                : 'bg-rose-500/10 border border-rose-500/20'
                            }`}
                    >
                        {/* Team indicator */}
                        <div className={`w-2 h-8 rounded-full ${goal.teamIndex === 0 ? 'bg-blue-500' : 'bg-rose-500'
                            }`} />

                        {/* Goal info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                                {goal.scorerName}
                            </p>
                            <p className="text-xs text-slate-400">
                                {positionLabels[goal.position]}
                            </p>
                        </div>

                        {/* Time */}
                        <span className="text-xs text-slate-500 font-mono">
                            {goalTime.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>

                        {/* Remove button (only for last goal) */}
                        {canRemove && isLastGoal && (
                            <button
                                onClick={() => onRemoveGoal?.(goal.goalId)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
