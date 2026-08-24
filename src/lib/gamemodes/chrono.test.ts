import { describe, it, expect } from 'vitest';
import {
    bonusGoals,
    allottedSeconds,
    elapsedMs,
    remainingSeconds,
    isTimeUp,
    outcomeAtZero,
    formatChrono,
    isCritical,
    type ChronoState,
} from './chrono';
import { CHRONO_MODE, BLITZ_MODE } from './modes';
import type { ModeTiming } from './types';

const CHRONO = CHRONO_MODE.timing as ModeTiming;   // 360 s, +30 s, but en or
const BLITZ = BLITZ_MODE.timing as ModeTiming;     // 120 s, +20 s, +20 s de prolongation

const T0 = 1_700_000_000_000;
const etat = (o: Partial<ChronoState> = {}): ChronoState => ({
    startedAtMs: T0,
    goalCount: 0,
    ...o,
});
/** `n` secondes après le coup d'envoi. */
const apres = (n: number) => T0 + n * 1000;

describe('les réglages des deux modes', () => {
    it('Chrono : six minutes, +30 s par but, but en or', () => {
        expect(CHRONO).toEqual({ baseSeconds: 360, bonusPerGoal: 30, tieBreak: 'golden-goal' });
    });

    it('Blitz : deux minutes, +20 s par but, prolongations de 20 s', () => {
        expect(BLITZ).toEqual({
            baseSeconds: 120, bonusPerGoal: 20, tieBreak: 'extra-time', extraSeconds: 20,
        });
    });

    it('les deux rapportent des packs (23/08)', () => {
        expect(CHRONO_MODE.rewards).toBe(true);
        expect(BLITZ_MODE.rewards).toBe(true);
    });

    it('mais le Blitz a SON classement, contrairement au Chrono', () => {
        expect(BLITZ_MODE.ladder).toBe('blitz');
        expect(CHRONO_MODE.ladder).toBeUndefined();
    });
});

describe('allottedSeconds — le temps acheté par les buts', () => {
    it('sans but, c\'est le temps de départ', () => {
        expect(allottedSeconds(etat(), CHRONO)).toBe(360);
        expect(allottedSeconds(etat(), BLITZ)).toBe(120);
    });

    it('chaque but rallonge, quelle que soit l\'équipe', () => {
        expect(allottedSeconds(etat({ goalCount: 3 }), CHRONO)).toBe(360 + 90);
        expect(allottedSeconds(etat({ goalCount: 3 }), BLITZ)).toBe(120 + 60);
    });

    it('les prolongations s\'ajoutent au total', () => {
        expect(allottedSeconds(etat({ extraPeriods: 2 }), BLITZ)).toBe(120 + 40);
    });
});

describe('bonusGoals — pas de bonus en prolongation', () => {
    it('avant toute prolongation, tous les buts comptent', () => {
        expect(bonusGoals(etat({ goalCount: 4 }))).toBe(4);
    });

    it('les buts marqués APRÈS le début des prolongations ne rallongent plus', () => {
        // Décision de Sacha (21/08) : sans ça, une égalité s'entretient sans fin.
        expect(bonusGoals(etat({ goalCount: 7, goalCountAtOvertime: 5 }))).toBe(5);
    });

    it('le temps alloué n\'augmente donc plus quand on marque en prolongation', () => {
        const avant = allottedSeconds(etat({ goalCount: 5, goalCountAtOvertime: 5, extraPeriods: 1 }), BLITZ);
        const apresBut = allottedSeconds(etat({ goalCount: 6, goalCountAtOvertime: 5, extraPeriods: 1 }), BLITZ);
        expect(apresBut).toBe(avant);
    });
});

describe('elapsedMs — les pauses ne consomment pas de temps', () => {
    it('sans pause, c\'est le temps réel', () => {
        expect(elapsedMs(etat(), apres(45))).toBe(45_000);
    });

    it('une pause terminée est déduite', () => {
        expect(elapsedMs(etat({ pausedTotalMs: 10_000 }), apres(45))).toBe(35_000);
    });

    it('une pause EN COURS se compte jusqu\'à maintenant', () => {
        // Sinon le chronomètre continuerait de descendre pendant la pause.
        const enPause = etat({ pausedAtMs: apres(30) });
        expect(elapsedMs(enPause, apres(30))).toBe(30_000);
        expect(elapsedMs(enPause, apres(90))).toBe(30_000);
    });

    it('jamais de temps écoulé négatif, même sur une horloge en arrière', () => {
        expect(elapsedMs(etat(), T0 - 5000)).toBe(0);
    });
});

describe('remainingSeconds', () => {
    it('descend seconde par seconde', () => {
        expect(remainingSeconds(etat(), CHRONO, apres(0))).toBe(360);
        expect(remainingSeconds(etat(), CHRONO, apres(60))).toBe(300);
    });

    it('un but rallonge immédiatement le temps restant', () => {
        expect(remainingSeconds(etat({ goalCount: 1 }), CHRONO, apres(60))).toBe(330);
    });

    it('ne descend jamais sous zéro', () => {
        expect(remainingSeconds(etat(), BLITZ, apres(9999))).toBe(0);
    });

    it('un but en or arrête le chronomètre', () => {
        expect(remainingSeconds(etat(), CHRONO, apres(9999), true)).toBe(Infinity);
    });

    it('deux appareils qui appliquent la formule au même instant voient la même seconde', () => {
        const e = etat({ goalCount: 4, pausedTotalMs: 3000 });
        expect(remainingSeconds(e, BLITZ, apres(100))).toBe(remainingSeconds(e, BLITZ, apres(100)));
    });

    it('un blitz sans but expire en deux minutes pile', () => {
        expect(remainingSeconds(etat(), BLITZ, apres(119))).toBe(1);
        expect(remainingSeconds(etat(), BLITZ, apres(120))).toBe(0);
    });
});

describe('isTimeUp', () => {
    it('faux tant qu\'il reste du temps', () => {
        expect(isTimeUp(etat(), BLITZ, apres(119))).toBe(false);
    });

    it('vrai à zéro', () => {
        expect(isTimeUp(etat(), BLITZ, apres(120))).toBe(true);
    });

    it('jamais vrai pendant un but en or', () => {
        expect(isTimeUp(etat(), CHRONO, apres(99999), true)).toBe(false);
    });
});

describe('outcomeAtZero — le coup de sifflet', () => {
    it('celui qui mène gagne', () => {
        expect(outcomeAtZero([5, 3], CHRONO)).toEqual({ kind: 'winner', team: 0 });
        expect(outcomeAtZero([2, 6], CHRONO)).toEqual({ kind: 'winner', team: 1 });
    });

    it('égalité en Chrono : but en or', () => {
        expect(outcomeAtZero([4, 4], CHRONO)).toEqual({ kind: 'golden-goal' });
    });

    it('égalité en Blitz : vingt secondes de plus', () => {
        expect(outcomeAtZero([4, 4], BLITZ)).toEqual({ kind: 'extra-time', seconds: 20 });
    });

    it('un 0-0 est une égalité comme une autre', () => {
        expect(outcomeAtZero([0, 0], BLITZ)).toEqual({ kind: 'extra-time', seconds: 20 });
    });
});

describe('formatChrono', () => {
    it('affiche mm:ss', () => {
        expect(formatChrono(360)).toBe('06:00');
        expect(formatChrono(65)).toBe('01:05');
        expect(formatChrono(9)).toBe('00:09');
        expect(formatChrono(0)).toBe('00:00');
    });

    it('le but en or n\'affiche pas de temps : il ne veut plus rien dire', () => {
        expect(formatChrono(Infinity)).toBe('--:--');
    });
});

describe('isCritical', () => {
    it('les trente dernières secondes', () => {
        expect(isCritical(31)).toBe(false);
        expect(isCritical(30)).toBe(true);
        expect(isCritical(1)).toBe(true);
    });

    it('zéro n\'est plus critique, c\'est fini', () => {
        expect(isCritical(0)).toBe(false);
    });

    it('un but en or n\'est pas un compte à rebours', () => {
        expect(isCritical(Infinity)).toBe(false);
    });
});
