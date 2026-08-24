import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Game, Player, GoalPosition, GoalType } from '@/types';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/solid';
import GameTimer from './GameTimer';
import ChronoBar from './ChronoBar';
import GageToast from './GageToast';
import { getMode, isNormalMode } from '@/lib/gamemodes/modes';
import ModeInfoModal from './ModeInfoModal';
import { evaluate, type TriggeredMessage } from '@/lib/gamemodes/engine';
import { useSound } from '@/hooks/useSound';
import styles from './GameBoard.module.css';
import PlayerRow from '@/components/common/PlayerRow';
import { usePlayerProfiles } from '@/lib/firebase/usePlayerProfiles';
import { useCatalog } from '@/lib/collection/catalogClient';
import { gameStartMs } from '@/lib/game/dates';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface GameBoardProps {
    game: Game;
    onAddGoal: (teamIndex: 0 | 1, scorerId: string, scorerName: string, position: GoalPosition, type: GoalType) => void;
    onPauseResume?: () => void;
    onTimeLimitReached?: () => void;
    onEndGame?: () => void;
    /** Fin déclenchée par le chronomètre : directe, sans confirmation. */
    onChronoEnd?: () => void;
    isViewer?: boolean;
}

const positions: { value: GoalPosition; label: string; color: string; isNarrow?: boolean }[] = [
    { value: 'goalkeeper', label: 'Gardien', color: 'green', isNarrow: true },
    { value: 'defense', label: 'Défense', color: 'blue' },
    { value: 'midfield', label: 'Milieu', color: 'yellow', isNarrow: true },
    { value: 'attack', label: 'Attaque', color: 'red' }
];

const goalTypes: { value: GoalType; label: string; description: string }[] = [
    { value: 'normal', label: 'Normal', description: 'But classique' },
    { value: 'flash', label: 'Flash', description: 'But éclair' },
    { value: 'gamelle', label: 'Gamelle', description: 'Le ballon ressort' },
    { value: 'gamelle_rentrante', label: 'Gamelle Rentrante', description: 'Ressort et rentre' }
];

export default function GameBoard({ game, onAddGoal, onTimeLimitReached, onEndGame, onChronoEnd, isViewer = false }: GameBoardProps) {
    const { play: playSound } = useSound({ volume: 0.7 });
    // Déclenche le chargement du catalogue : sans lui, les bannières ne
    // s'affichent qu'au rendu suivant.
    useCatalog();

    /* L'ELO, la bannière et le titre viennent du MÊME accès que le lobby.
     *
     * DÉFAUT CORRIGÉ (22/08) : la page passait deux objets distincts, un pour
     * l'ELO et un pour les cosmétiques, et celui des cosmétiques ne portait pas
     * l'ELO. Résultat, tout le monde affichait le même grade pendant le match.
     *
     * Deux sources pour la même chose finissent toujours par diverger : il n'y
     * en a plus qu'une. */
    const profils = usePlayerProfiles(
        game.teams.flatMap(t => t.players.map(p => p.userId)),
        { withRank: true },
    );

    /*
     * Limite d'une heure.
     *
     * On dépend de l'INSTANT de début, pas de l'objet `game` : celui-ci change
     * de référence à chaque but, ce qui relancerait l'intervalle toutes les
     * quelques secondes. L'instant de début, lui, ne bouge pas de la partie.
     */
    const debutMs = gameStartMs(game);
    useEffect(() => {
        if (isViewer || !debutMs) return;

        const checkTimeLimit = () => {
            const debut = debutMs;
            if (debut === 0) return;
            const elapsedSeconds = Math.floor((Date.now() - debut) / 1000);

            if (elapsedSeconds >= 3600) { // 1 hour = 3600 seconds
                onTimeLimitReached?.();
            }
        };

        // Check every 10 seconds
        const interval = setInterval(checkTimeLimit, 10000);
        checkTimeLimit(); // Initial check

        return () => clearInterval(interval);
    }, [debutMs, isViewer, onTimeLimitReached]);
    const [activeTeamIndex, setActiveTeamIndex] = useState<0 | 1 | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<GoalPosition | null>(null);
    const [step, setStep] = useState<'player' | 'position' | 'type'>('player');

    // Animation states for scores

    // Flash animation state
    // ─── Règles sociales (chantier 7.3) ──────────────────────────────────────
    // Couche d'ÉCOUTE par-dessus le moteur de score, jamais dedans : on observe
    // les buts qui arrivent et on affiche un message. Le score, les stats et
    // l'ELO ne sont jamais touchés (garde-fou du doc 33).
    const [gages, setGages] = useState<TriggeredMessage[]>([]);
    const firedRules = useRef<Set<string>>(new Set());
    const lastSeenGoalCount = useRef<number>(game.goals?.length ?? 0);

    useEffect(() => {
        const goals = game.goals ?? [];
        // On ne réagit qu'aux buts NOUVEAUX. Sans ce garde, chaque re-rendu
        // (et chaque mise à jour temps réel) rejouerait tous les gages.
        if (goals.length <= lastSeenGoalCount.current) {
            lastSeenGoalCount.current = goals.length;
            return;
        }
        lastSeenGoalCount.current = goals.length;

        const mode = getMode(game.modeId);
        if (mode.rules.length === 0) return;

        const triggered = evaluate(
            mode,
            { kind: 'goal', goal: goals[goals.length - 1], teams: game.teams },
            firedRules.current
        );
        if (triggered.length === 0) return;

        triggered.forEach(m => firedRules.current.add(m.ruleId));
        setGages(triggered);
    }, [game.goals, game.teams, game.modeId]);

    const dismissGages = useCallback(() => setGages([]), []);
    const [showModeInfo, setShowModeInfo] = useState(false);
    const activeMode = getMode(game.modeId);

    const [showFlashAnimation, setShowFlashAnimation] = useState(false);
    const [flashAnimationData, setFlashAnimationData] = useState<object | null>(null);

    useEffect(() => {
        fetch('/animations/LIGHTNING.json')
            .then(r => r.json())
            .then(setFlashAnimationData);
    }, []);

    const team1 = game.teams[0];
    const team2 = game.teams[1];

    /* L'animation du score ne passe par AUCUN état.
     *
     * Chaque chiffre porte `key={game.score[i]}` : un but change la clé, React
     * remonte l'élément, et son animation CSS rejoue. C'est tout.
     *
     * L'ancienne version tenait un `prevScore` en état et appelait `setState`
     * depuis un effet qui avait `prevScore` en dépendance — un rendu de plus à
     * chaque but, pour une valeur que personne n'affiche. React 19 refuse ce
     * motif, et il a raison.
     *
     * Même technique que le « +30 s » du chronomètre : quand une animation doit
     * rejouer à chaque changement, la clé suffit. */



    const handleStartAddGoal = (teamIndex: 0 | 1, player?: Player) => {
        const team = game.teams[teamIndex];
        setActiveTeamIndex(teamIndex);

        if (player) {
            setSelectedPlayer(player);
            setStep('position');
        } else if (team.players.length === 1) {
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
        if (activeTeamIndex !== null && selectedPlayer) {
            onAddGoal(activeTeamIndex, selectedPlayer.userId, selectedPlayer.username, position, 'normal');
            playGoalSound('normal');
            handleCancel();
        }
    };

    const handleOpenTypeSelection = (position: GoalPosition) => {
        setSelectedPosition(position);
        setStep('type');
    };

    const handleSelectGoalType = (type: GoalType) => {
        if (activeTeamIndex !== null && selectedPlayer && selectedPosition) {
            onAddGoal(activeTeamIndex, selectedPlayer.userId, selectedPlayer.username, selectedPosition, type);
            playGoalSound(type);
            if (type === 'flash') {
                setShowFlashAnimation(true);
                setTimeout(() => setShowFlashAnimation(false), 2000);
            }
            handleCancel();
        }
    };

    const playGoalSound = (goalType: GoalType) => {
        if (goalType === 'gamelle' || goalType === 'gamelle_rentrante') {
            playSound('goal-gamelle');
        } else {
            playSound('goal-normal');
        }
    };

    const renderGoalInput = (teamIndex: 0 | 1) => {
        const team = game.teams[teamIndex];
        const teamColorClass = styles[team.color] || styles.slate;

        return (
            <div className={styles.modalOverlay}>
                <div className={`${styles.modalContent} ${teamColorClass}`}>
                    <div className={styles.inputHeader}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                                    // La même carte que partout ailleurs : le
                                    // choix du buteur n'est qu'une liste de
                                    // joueurs de plus.
                                    <PlayerRow key={player.userId}
                                        username={player.username}
                                        profile={profils[player.userId]}
                                        onClick={() => handleSelectPlayer(player)}
                                        className={styles.playerButton}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Step 2: Position Selection */}
                        {step === 'position' && (
                            <div className={styles.selectionGrid}>
                                {positions.map(pos => (
                                    <div key={pos.value} className={`${styles.positionContainer} ${pos.isNarrow ? styles.narrowContainer : ''}`}>
                                        <button onClick={() => handleSelectPosition(pos.value)}
                                            className={`${styles.positionButton} ${pos.isNarrow ? styles.narrowButton : ''} ${pos.color === 'green' ? styles.bgGreen :
                                                pos.color === 'blue' ? styles.bgBlue :
                                                    pos.color === 'yellow' ? styles.bgYellow :
                                                        styles.bgRed
                                                }`}
                                        >
                                            <span className={styles.positionLabel}>{pos.label}</span>
                                        </button>
                                        <button onClick={() => handleOpenTypeSelection(pos.value)}
                                            className={`${styles.starButton} ${pos.color === 'green' ? styles.bgGreen :
                                                pos.color === 'blue' ? styles.bgBlue :
                                                    pos.color === 'yellow' ? styles.bgYellow :
                                                        styles.bgRed
                                                }`}
                                        >
                                            <StarIcon className={styles.starIcon} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 3: Goal Type Selection */}
                        {step === 'type' && (
                            <div className={styles.typeGrid}>
                                {goalTypes.map(type => (
                                    <button key={type.value}
                                        onClick={() => handleSelectGoalType(type.value)}
                                        className={`${styles.typeButton} ${type.value === 'normal' ? styles.bgNormal :
                                            type.value === 'flash' ? styles.bgFlash :
                                                type.value === 'gamelle' ? styles.bgGamelle :
                                                    type.value === 'gamelle_rentrante' ? styles.bgGamelleRentrante :
                                                        ''
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

    return (
        <div className={styles.hostLandscapeMode}>
            {isViewer && (
                <div className={styles.viewerBadge}>
                    MODE SPECTATEUR
                </div>
            )}
            {/* Rappel permanent du mode de jeu.
                SA PROPRE LIGNE, au-dessus de la carte de score, volontairement.
                Deux tentatives précédentes ont échoué pour la même raison : la
                carte porte des dégradés décoratifs en position absolue, donc un
                `overflow: hidden` obligatoire. Tout ce qu'on y ajoute finit
                rogné ou superposé. Une info de match mérite sa propre ligne. */}
            {!isNormalMode(game.modeId) && (
                <div className={styles.modeBar}>
                    <button type="button"
                        className={styles.modeBadge}
                        onClick={() => setShowModeInfo(true)}
                        aria-label={`Règles du mode ${activeMode.name}`}
                    >
                        MODE {activeMode.name.toUpperCase()}
                        <span className={styles.modeBadgeInfo}>i</span>
                    </button>
                </div>
            )}

            {/* Score Board */}
            <div className={`${styles.scoreBoard} ${styles.scoreBoardShell}`}>
                {/* Background Accents */}
                <div className={`${styles.gradientAccent} ${styles.gradientAccentLeft} ${styles[team1.color] || styles.slate}`} />
                <div className={`${styles.gradientAccent} ${styles.gradientAccentRight} ${styles[team2.color] || styles.slate}`} />

                <div className={styles.scoreBoardContent}>
                    {/* Team 1 Score */}
                    <div className={`${styles.teamScore} ${styles[team1.color] || styles.slate}`}>
                        <div key={game.score[0]} className={`${styles.scoreValue} ${styles.scoreValueAnimated}`}>
                            {game.score[0]}
                        </div>
                    </div>

                    {/* Timer & Info */}
                    <div className={styles.centerInfo}>
                        <div className={styles.timerWrapper}>
                            {/* Un mode au temps remplace le minuteur décoratif par
                                un vrai compte à rebours, qui termine la partie.
                                Les autres modes gardent le compteur croissant. */}
                            {activeMode.timing ? (
                                <ChronoBar game={game}
                                    timing={activeMode.timing}
                                    isHost={!isViewer}
                                    onTimeUp={() => onChronoEnd?.()}
                                />
                            ) : (
                                <GameTimer startedAt={game.startTime} />
                            )}
                        </div>
                        {game.multiplier > 1 && (
                            <div className={styles.multiplierBadge}>
                                PROCHAIN BUT: {game.multiplier} PTS
                            </div>
                        )}

                        {!isViewer && (
                            <button onClick={onEndGame}
                                className={styles.finishMatchButton}
                            >
                                FINIR LE MATCH
                            </button>
                        )}
                    </div>

                    {/* Team 2 Score */}
                    <div className={`${styles.teamScore} ${styles[team2.color] || styles.slate}`}>
                        <div key={game.score[1]} className={`${styles.scoreValue} ${styles.scoreValueAnimated}`}>
                            {game.score[1]}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gages du mode de jeu — purement déclaratif, aucun effet sur la partie */}
            <GageToast messages={gages} onDismiss={dismissGages} />
            <ModeInfoModal mode={showModeInfo ? activeMode : null} onClose={() => setShowModeInfo(false)} />

            {/* Flash Animation Overlay */}
            {showFlashAnimation && flashAnimationData && (
                <div className={styles.flashOverlay}>
                    <Lottie animationData={flashAnimationData}
                        loop={false}
                        className={styles.flashLottie}
                    />
                </div>
            )}

            {/* Goal Controls - Only for Host */}
            {!isViewer && (
                <div className={styles.controlsContainer}>
                    <div className={styles.buttonsGrid}>
                        {/* Team 1 Buttons */}
                        <div className={styles.teamButtonsColumn}>
                            {team1.players.map((player) => (
                                <button key={player.userId}
                                    onClick={() => handleStartAddGoal(0, player)}
                                    disabled={activeTeamIndex !== null}
                                    className={`
                                        ${styles.goalButton}
                                        ${styles[team1.color] || styles.slate}
                                        ${(activeTeamIndex === 0 && selectedPlayer?.userId === player.userId) ? styles.goalButtonActive : styles.goalButtonInactive}
                                        ${activeTeamIndex === 1 ? styles.goalButtonDisabled : ''}
                                    `}
                                >
                                    {/* EXACTEMENT la carte du lobby, avec le pseudo
                                        en grand : on lit de loin et de travers
                                        pendant un match. Le ratio de bannière est
                                        imposé par `PlayerBanner`, donc respecté
                                        d'office, en 1v1 comme en 2v2. */}
                                    {/* Pas d'icône « + » : toute la carte EST le
                                        bouton, l'icône n'apprenait rien et
                                        mangeait la place du pseudo. */}
                                    <PlayerRow username={player.username}
                                        profile={profils[player.userId]}
                                        size="large"
                                        className={styles.goalButtonRow}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Team 2 Buttons */}
                        <div className={styles.teamButtonsColumn}>
                            {team2.players.map((player) => (
                                <button key={player.userId}
                                    onClick={() => handleStartAddGoal(1, player)}
                                    disabled={activeTeamIndex !== null}
                                    className={`
                                        ${styles.goalButton}
                                        ${styles[team2.color] || styles.slate}
                                        ${(activeTeamIndex === 1 && selectedPlayer?.userId === player.userId) ? styles.goalButtonActive : styles.goalButtonInactive}
                                        ${activeTeamIndex === 0 ? styles.goalButtonDisabled : ''}
                                    `}
                                >
                                    {/* EXACTEMENT la carte du lobby, avec le pseudo
                                        en grand : on lit de loin et de travers
                                        pendant un match. Le ratio de bannière est
                                        imposé par `PlayerBanner`, donc respecté
                                        d'office, en 1v1 comme en 2v2. */}
                                    {/* Pas d'icône « + » : toute la carte EST le
                                        bouton, l'icône n'apprenait rien et
                                        mangeait la place du pseudo. */}
                                    <PlayerRow username={player.username}
                                        profile={profils[player.userId]}
                                        size="large"
                                        className={styles.goalButtonRow}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inline Goal Input */}
                    {activeTeamIndex !== null && renderGoalInput(activeTeamIndex)}
                </div>
            )}
        </div>
    );
}

