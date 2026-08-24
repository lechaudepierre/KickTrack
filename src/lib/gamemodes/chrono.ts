/**
 * LE CHRONOMÈTRE — calcul pur, chantier 7.10.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AUCUNE HORLOGE N'EST DE CONFIANCE, ET AUCUN COMPTEUR NON PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 * Plusieurs téléphones regardent la même partie autour de la table. Si chacun
 * décomptait de son côté, ils dériveraient : un appareil mis en veille, un
 * onglet en arrière-plan, et les deux écrans n'affichent plus la même chose au
 * moment où le match se joue.
 *
 * Le temps restant est donc DÉDUIT, à chaque affichage, de données que tout le
 * monde partage et qui vivent dans Firestore :
 *   - l'heure de coup d'envoi,
 *   - le nombre de buts marqués,
 *   - les prolongations déjà accordées,
 *   - le temps passé en pause.
 *
 * Deux appareils qui appliquent la même formule aux mêmes données affichent la
 * même seconde. C'est aussi ce qui rend le calcul rejouable après un
 * rafraîchissement : rien n'est perdu, tout se recalcule.
 *
 * Module pur : ni React, ni Firebase, ni `Date.now()` — l'instant est TOUJOURS
 * passé en paramètre, sinon rien ne serait testable.
 */

import type { ModeTiming } from './types';

/** L'état d'une partie chronométrée, tel qu'il vit sur le document Firestore. */
export interface ChronoState {
    /** Coup d'envoi, en millisecondes. */
    startedAtMs: number;
    /** Nombre de buts marqués depuis le début, toutes équipes confondues. */
    goalCount: number;
    /**
     * Buts déjà marqués au moment où la première prolongation a démarré.
     *
     * Sert à neutraliser le bonus pendant les prolongations (décision de Sacha,
     * 21/08) : sans ça, une égalité pourrait s'entretenir indéfiniment.
     * `null` tant qu'aucune prolongation n'a été accordée.
     */
    goalCountAtOvertime?: number | null;
    /** Prolongations accordées jusqu'ici. */
    extraPeriods?: number;
    /** Millisecondes cumulées passées en pause. */
    pausedTotalMs?: number;
    /** Instant de mise en pause si la partie est actuellement en pause. */
    pausedAtMs?: number | null;
}

/**
 * Buts qui donnent droit au bonus.
 *
 * Une fois la prolongation entamée, les buts ne rallongent plus le chronomètre.
 */
export function bonusGoals(state: ChronoState): number {
    const gel = state.goalCountAtOvertime;
    if (gel === null || gel === undefined) return Math.max(0, state.goalCount);
    return Math.max(0, Math.min(state.goalCount, gel));
}

/** Temps total alloué, en secondes : base + bonus + prolongations. */
export function allottedSeconds(state: ChronoState, timing: ModeTiming): number {
    const prolongations = (state.extraPeriods ?? 0) * (timing.extraSeconds ?? 0);
    return timing.baseSeconds + bonusGoals(state) * timing.bonusPerGoal + prolongations;
}

/** Millisecondes écoulées, pauses déduites. */
export function elapsedMs(state: ChronoState, nowMs: number): number {
    const brut = nowMs - state.startedAtMs;
    // Une pause en cours se compte jusqu'à MAINTENANT : sinon le chronomètre
    // continuerait de descendre pendant qu'on va chercher une bière.
    const enCours = state.pausedAtMs ? Math.max(0, nowMs - state.pausedAtMs) : 0;
    return Math.max(0, brut - (state.pausedTotalMs ?? 0) - enCours);
}

/**
 * Secondes restantes, jamais négatives.
 *
 * Renvoie `Infinity` pendant un but en or : le chronomètre est arrêté, c'est le
 * prochain but qui tranche.
 */
export function remainingSeconds(
    state: ChronoState,
    timing: ModeTiming,
    nowMs: number,
    goldenGoal = false,
): number {
    if (goldenGoal) return Infinity;
    const restant = allottedSeconds(state, timing) - Math.floor(elapsedMs(state, nowMs) / 1000);
    return Math.max(0, restant);
}

/** Le chronomètre est-il à zéro ? */
export function isTimeUp(
    state: ChronoState,
    timing: ModeTiming,
    nowMs: number,
    goldenGoal = false,
): boolean {
    return remainingSeconds(state, timing, nowMs, goldenGoal) <= 0;
}

/** Ce qu'il faut faire quand le chronomètre atteint zéro. */
export type ZeroOutcome =
    | { kind: 'winner'; team: 0 | 1 }
    | { kind: 'golden-goal' }
    | { kind: 'extra-time'; seconds: number };

/**
 * Que se passe-t-il au coup de sifflet ?
 *
 * @param score score des deux équipes, dans l'ordre [équipe 0, équipe 1]
 */
export function outcomeAtZero(score: [number, number], timing: ModeTiming): ZeroOutcome {
    if (score[0] !== score[1]) {
        return { kind: 'winner', team: score[0] > score[1] ? 0 : 1 };
    }
    if (timing.tieBreak === 'golden-goal') return { kind: 'golden-goal' };
    return { kind: 'extra-time', seconds: timing.extraSeconds ?? 0 };
}

/** `mm:ss`, ou `--:--` pour un but en or où le temps ne veut plus rien dire. */
export function formatChrono(seconds: number): string {
    if (!Number.isFinite(seconds)) return '--:--';
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Le chronomètre entre-t-il dans sa phase critique ?
 * Sert à changer l'affichage : c'est là que se joue l'intérêt du mode.
 */
export function isCritical(seconds: number, seuil = 30): boolean {
    return Number.isFinite(seconds) && seconds <= seuil && seconds > 0;
}
