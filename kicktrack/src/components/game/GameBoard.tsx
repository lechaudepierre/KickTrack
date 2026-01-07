import { useState } from 'react';
import { Game, Team, Player, GoalPosition } from '@/types';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import GameTimer from './GameTimer';
import styles from './GameBoard.module.css';

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
    const [activeTeamIndex, setActiveTeamIndex] = useState<0 | 1 | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const team1 = game.teams[0];
    const team2 = game.teams[1];

    const getTeamColors = (teamIndex: 0 | 1) => {
        const team = game.teams[teamIndex];
        const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
            blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' },
            red: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500', light: 'bg-red-500/10' },
            green: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500', light: 'bg-green-500/10' },
            yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-500/10' },
            purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500', light: 'bg-purple-500/10' },
            orange: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', light: 'bg-orange-500/10' },
            slate: { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-500', light: 'bg-slate-500/10' },
        };
        return colorMap[team.color] || colorMap.slate;
    };

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

        return (
            <div className={`w-full bg-[#1E293B] border-2 ${colors.border} rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl`}>
                <div className={`p-5 flex items-center justify-between ${colors.light} border-b ${colors.border}`}>
                    <span className={`font-bold text-lg ${colors.text}`}>
                        {selectedPlayer ? 'Comment ?' : 'Qui a marqué ?'}
                    </span>
                    <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className={`w-6 h-6 ${colors.text}`} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Step 1: Player Selection (if not 1v1 or not selected) */}
                    {!selectedPlayer && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {team.players.map(player => (
                                <button
                                    key={player.userId}
                                    onClick={() => handleSelectPlayer(player)}
                                    className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#0F172A] hover:bg-[#334155] transition-all border border-[#334155] hover:border-white/20 group"
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${colors.bg} shadow-lg group-hover:scale-110 transition-transform`}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm font-medium text-white truncate w-full text-center">{player.username}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Position Selection (if player selected) */}
                    {selectedPlayer && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {positions.map(pos => (
                                <button
                                    key={pos.value}
                                    onClick={() => handleSelectPosition(pos.value)}
                                    className={`p-4 rounded-xl border-2 border-[#334155] bg-[#0F172A] hover:bg-[#334155] transition-all text-sm font-bold text-slate-300 hover:text-white hover:border-${colors.bg.split('-')[1]}-500 flex flex-col items-center justify-center gap-2 h-24`}
                                >
                                    <span className="text-lg">{pos.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {/* Score Board */}
            <div className={styles.scoreBoard}>
                {/* Background Accents */}
                <div className={`${styles.gradientAccent} ${styles.gradientAccentLeft} ${styles[team1.color] || styles.slate}`} />
                <div className={`${styles.gradientAccent} ${styles.gradientAccentRight} ${styles[team2.color] || styles.slate}`} />

                <div className={styles.scoreBoardContent}>
                    {/* Team 1 Score */}
                    <div className={`${styles.teamScore} ${styles[team1.color] || styles.slate}`}>
                        <div className={styles.scoreValue}>
                            {game.score[0]}
                        </div>
                        <div className={styles.teamInfo}>
                            <div className={styles.playerAvatars}>
                                {team1.players.map((player) => (
                                    <div key={player.userId} className={styles.avatar}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                ))}
                            </div>
                            <span className={styles.teamLabel}>Équipe 1</span>
                        </div>
                    </div>

                    {/* Timer & Info */}
                    <div className={styles.centerInfo}>
                        <div className={styles.timerWrapper}>
                            <GameTimer startedAt={game.startTime} />
                        </div>
                        <div className={styles.vsLabel}>VS</div>
                        {game.multiplier > 1 && (
                            <div className={styles.multiplierBadge}>
                                {game.multiplier}x POINTS
                            </div>
                        )}
                    </div>

                    {/* Team 2 Score */}
                    <div className={`${styles.teamScore} ${styles[team2.color] || styles.slate}`}>
                        <div className={styles.scoreValue}>
                            {game.score[1]}
                        </div>
                        <div className={styles.teamInfo}>
                            <div className={styles.playerAvatars}>
                                {team2.players.map((player) => (
                                    <div key={player.userId} className={styles.avatar}>
                                        {player.username?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                ))}
                            </div>
                            <span className={styles.teamLabel}>Équipe 2</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Goal Controls */}
            <div className={styles.controlsContainer}>
                <div className={styles.buttonsGrid}>
                    {/* Team 1 Button */}
                    <button
                        onClick={() => handleStartAddGoal(0)}
                        disabled={activeTeamIndex !== null}
                        className={`
                            ${styles.goalButton} 
                            ${styles[team1.color] || styles.slate}
                            ${activeTeamIndex === 0 ? styles.goalButtonActive : styles.goalButtonInactive}
                            ${activeTeamIndex === 1 ? styles.goalButtonDisabled : ''}
                        `}
                    >
                        {!activeTeamIndex && (
                            <div className={styles.buttonOverlay} />
                        )}
                        <div className={styles.buttonContent}>
                            <div className={`
                                ${styles.iconWrapper} 
                                ${activeTeamIndex === 0 ? styles.iconWrapperActive : ''}
                            `}>
                                <PlusIcon className={styles.plusIcon} />
                            </div>
                            <span className={`
                                ${styles.buttonLabel}
                                ${activeTeamIndex === 0 ? styles.buttonLabelActive : ''}
                            `}>But Équipe 1</span>
                        </div>
                    </button>

                    {/* Team 2 Button */}
                    <button
                        onClick={() => handleStartAddGoal(1)}
                        disabled={activeTeamIndex !== null}
                        className={`
                            ${styles.goalButton} 
                            ${styles[team2.color] || styles.slate}
                            ${activeTeamIndex === 1 ? styles.goalButtonActive : styles.goalButtonInactive}
                            ${activeTeamIndex === 0 ? styles.goalButtonDisabled : ''}
                        `}
                    >
                        {!activeTeamIndex && (
                            <div className={styles.buttonOverlay} />
                        )}
                        <div className={styles.buttonContent}>
                            <div className={`
                                ${styles.iconWrapper} 
                                ${activeTeamIndex === 1 ? styles.iconWrapperActive : styles.iconWrapperHover}
                            `}>
                                <PlusIcon className={styles.plusIcon} />
                            </div>
                            <span className={`
                                ${styles.buttonLabel}
                                ${activeTeamIndex === 1 ? styles.buttonLabelActive : ''}
                            `}>But Équipe 2</span>
                        </div>
                    </button>
                </div>

                {/* Inline Goal Input */}
                {activeTeamIndex !== null && renderGoalInput(activeTeamIndex, getTeamColors(activeTeamIndex))}
            </div>
        </div>
    );
}
