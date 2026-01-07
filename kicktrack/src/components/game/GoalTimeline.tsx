'use client';

import { Goal, GoalPosition } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import styles from './GoalTimeline.module.css';

interface GoalTimelineProps {
    goals: Goal[];
    onRemoveGoal?: (goalId: string) => void;
    canRemove?: boolean;
}

const positionLabels: Record<GoalPosition, string> = {
    defense: 'Défense',
    midfield: 'Milieu',
    attack: 'Attaque',
    goalkeeper: 'Gardien'
};

export default function GoalTimeline({ goals, onRemoveGoal, canRemove = false }: GoalTimelineProps) {
    if (goals.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                Aucun but pour le moment
            </div>
        );
    }

    return (
        <div className={styles.timelineContainer}>
            {[...goals].reverse().map((goal, index) => {
                const isLastGoal = index === 0;
                const goalTime = goal.timestamp instanceof Date
                    ? goal.timestamp
                    : new Date(goal.timestamp);

                return (
                    <div
                        key={goal.id || index}
                        className={`${styles.goalItem} ${goal.teamIndex === 0 ? styles.goalItemTeam0 : styles.goalItemTeam1}`}
                    >
                        {/* Team indicator */}
                        <div className={`${styles.teamIndicator} ${goal.teamIndex === 0 ? styles.teamIndicator0 : styles.teamIndicator1}`} />

                        {/* Goal info */}
                        <div className={styles.goalInfo}>
                            <p className={styles.scorerName}>
                                {goal.scorerName}
                            </p>
                            <p className={styles.goalPosition}>
                                {goal.position ? positionLabels[goal.position] : 'Inconnu'}
                            </p>
                        </div>

                        {/* Time */}
                        <span className={styles.timestamp}>
                            {goalTime.toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>

                        {/* Remove button (only for last goal) */}
                        {canRemove && isLastGoal && (
                            <button
                                onClick={() => goal.id && onRemoveGoal?.(goal.id)}
                                className={styles.removeButton}
                            >
                                <XMarkIcon className={styles.removeIcon} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
