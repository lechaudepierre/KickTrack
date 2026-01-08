import { useState, useEffect } from 'react';
import { Game, Team, Player, GoalPosition, GoalType } from '@/types';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import GameTimer from './GameTimer';
import styles from './GameBoard.module.css';

interface GameBoardProps {
    game: Game;
    onAddGoal: (teamIndex: 0 | 1, scorerId: string, scorerName: string, position: GoalPosition, type: GoalType) => void;
    onPauseResume?: () => void;
}

const positions: { value: GoalPosition; label: string; color: string }[] = [
    { value: 'goalkeeper', label: 'Gardien', color: 'green' },
    { value: 'defense', label: 'Défense', color: 'blue' },
    { value: 'midfield', label: 'Milieu', color: 'yellow' },
    { value: 'attack', label: 'Attaque', color: 'red' }
];

const goalTypes: { value: GoalType; label: string; description: string }[] = [
    { value: 'normal', label: 'Normal', description: 'But classique' },
    { value: 'gamelle', label: 'Gamelle', description: 'Le ballon ressort' },
    { value: 'gamelle_rentrante', label: 'Gamelle Rentrante', description: 'Ressort et rentre' }
];

export default function GameBoard({ game, onAddGoal, onPauseResume }: GameBoardProps) {
    const [activeTeamIndex, setActiveTeamIndex] = useState<0 | 1 | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<GoalPosition | null>(null);
    const [step, setStep] = useState<'player' | 'position' | 'type'>('player');

    // Animation states for scores
    const [animatingScore, setAnimatingScore] = useState<0 | 1 | null>(null);

    const team1 = game.teams[0];
    const team2 = game.teams[1];

    // Use state to track previous score for animation
    const [prevScore, setPrevScore] = useState<[number, number]>(game.score);
    useEffect(() => {
        if (game.score[0] !== prevScore[0]) {
            setAnimatingScore(0);
            setTimeout(() => setAnimatingScore(null), 600);
        } else if (game.score[1] !== prevScore[1]) {
            setAnimatingScore(1);
            setTimeout(() => setAnimatingScore(null), 600);
        }
        setPrevScore(game.score);
    }, [game.score, prevScore]);

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

        if (team.players.length === 1) {
            setSelectedPlayer(team.players[0]);
            setStep('position');
        } else {
            setSelectedPlayer(null);
            setStep('player');
        }
    };

    const handleCancel = () => {
        setActiveTeamIndex(null);
        setSelectedPlayer(null);
        setSelectedPosition(null);
        setStep('player');
    };

    const handleSelectPlayer = (player: Player) => {
        setSelectedPlayer(player);
        setStep('position');
    };

    const handleSelectPosition = (position: GoalPosition) => {
        setSelectedPosition(position);
        if (position === 'midfield') {
            if (activeTeamIndex !== null && selectedPlayer) {
                onAddGoal(activeTeamIndex, selectedPlayer.userId, selectedPlayer.username, position, 'normal');
                handleCancel();
            }
        } else {
            setStep('type');
        }
    };

    const handleSelectGoalType = (type: GoalType) => {
        if (activeTeamIndex !== null && selectedPlayer && selectedPosition) {
            onAddGoal(activeTeamIndex, selectedPlayer.userId, selectedPlayer.username, selectedPosition, type);
            handleCancel();
        }
    };

    const renderGoalInput = (teamIndex: 0 | 1) => {
        const team = game.teams[teamIndex];
        const teamColorClass = styles[team.color] || styles.slate;

        return (
            <div className={styles.modalOverlay}>
                <div className={`${styles.modalContent} ${teamColorClass}`}>
                    <div className={styles.inputHeader}>
                        <div className="flex flex-col">
                            <span className={styles.inputTitle}>
                                {step === 'player' && 'Qui a marqué ?'}
                                {step === 'position' && 'Position du tir'}
                                {step === 'type' && 'Type de but'}
                            </span>
                            {selectedPlayer && step !== 'player' && (
                                <span className={styles.inputSubtitle}>Buteur: {selectedPlayer.username}</span>
                            )}
                        </div>
                        <button onClick={handleCancel} className={styles.closeButton}>
                            <XMarkIcon className={styles.closeIcon} />
                        </button>
                    </div>

                    <div className={styles.inputContent}>
                        {/* Step 1: Player Selection */}
                        {step === 'player' && (
                            <div className={styles.selectionGrid}>
                                {team.players.map(player => (
                                    <button
                                        key={player.userId}
                                        onClick={() => handleSelectPlayer(player)}
                                        className={styles.playerButton}
                                    >
                                        <div className={styles.playerAvatar}>
                                            {player.username?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span className={styles.playerName}>{player.username}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Position Selection */}
                        {step === 'position' && (
                            <div className={styles.selectionGrid}>
                                {positions.map(pos => (
                                    <button
                                        key={pos.value}
                                        onClick={() => handleSelectPosition(pos.value)}
                                        className={`${styles.positionButton} ${pos.color === 'green' ? styles.bgGreen :
                                            pos.color === 'blue' ? styles.bgBlue :
                                                pos.color === 'yellow' ? styles.bgYellow :
                                                    styles.bgRed
                                            }`}
                                    >
                                        <span className={styles.positionLabel}>{pos.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 3: Goal Type Selection */}
                        {step === 'type' && (
                            <div className={styles.typeGrid}>
                                {goalTypes.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleSelectGoalType(type.value)}
                                        className={`${styles.typeButton} ${type.value === 'normal' ? `${styles.bgNormal} ${styles.fullWidth}` :
                                            type.value === 'gamelle' ? styles.bgGamelle :
                                                styles.bgGamelleRentrante
                                            }`}
                                    >
                                        <span className={styles.typeLabel}>{type.label}</span>
                                        <span className={styles.typeDesc}>{type.description}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const getTeamName = (teamIndex: 0 | 1) => {
        const team = game.teams[teamIndex];
        const colorMap: Record<string, string> = {
            red: 'Équipe Rouge',
            blue: 'Équipe Bleue',
            green: 'Équipe Verte',
            yellow: 'Équipe Jaune',
            orange: 'Équipe Orange',
            purple: 'Équipe Violette',
            slate: 'Équipe'
        };
        return colorMap[team.color] || 'Équipe';
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
                        <div className={`${styles.scoreValue} ${animatingScore === 0 ? styles.scoreValueAnimated : ''}`}>
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
                            <span className={styles.teamLabel}>{getTeamName(0)}</span>
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
                                PROCHAIN BUT: {game.multiplier} PTS
                            </div>
                        )}
                    </div>

                    {/* Team 2 Score */}
                    <div className={`${styles.teamScore} ${styles[team2.color] || styles.slate}`}>
                        <div className={`${styles.scoreValue} ${animatingScore === 1 ? styles.scoreValueAnimated : ''}`}>
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
                            <span className={styles.teamLabel}>{getTeamName(1)}</span>
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
                            `}>But {getTeamName(0)}</span>
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

                        <div className={styles.buttonContent}>
                            <div className={`
                                ${styles.iconWrapper} 
                                ${activeTeamIndex === 1 ? styles.iconWrapperActive : ''}
                            `}>
                                <PlusIcon className={styles.plusIcon} />
                            </div>
                            <span className={`
                                ${styles.buttonLabel}
                                ${activeTeamIndex === 1 ? styles.buttonLabelActive : ''}
                            `}>But {getTeamName(1)}</span>
                        </div>
                    </button>
                </div>

                {/* Inline Goal Input */}
                {activeTeamIndex !== null && renderGoalInput(activeTeamIndex)}
            </div>
        </div>
    );
}

