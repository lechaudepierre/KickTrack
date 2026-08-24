/**
 * Tests des célébrations de fin de partie.
 *
 * Les seuils de grade viennent de `rankUtils` : Argent < 900, Or 900-1049,
 * Diamant 1050-1199, Master 1200-1349, GrandMaster >= 1350.
 */

import { describe, it, expect } from 'vitest';
import { computeCelebrations, pickAnimation, STREAK_THRESHOLD } from './celebrations';

describe('changement de grade', () => {
    it('annonce une montée de famille', () => {
        const [c] = computeCelebrations({ previousElo: 890, newElo: 910 });
        expect(c.kind).toBe('grade_up');
        expect(c.detail).toContain('Or');
    });

    it('annonce une montée de palier dans la même famille', () => {
        // Or III (900-949) vers Or II (950-999)
        const [c] = computeCelebrations({ previousElo: 945, newElo: 960 });
        expect(c.kind).toBe('grade_up');
        expect(c.detail).toBe('Or II');
    });

    it('annonce une rétrogradation, sans la fêter', () => {
        const [c] = computeCelebrations({ previousElo: 910, newElo: 880 });
        expect(c.kind).toBe('grade_down');
        // Pas d'animation : ce n'est pas un moment à célébrer.
        expect(c.animation).toBeUndefined();
    });

    it('ne dit rien quand le grade ne bouge pas', () => {
        expect(computeCelebrations({ previousElo: 1000, newElo: 1020 })).toEqual([]);
    });

    it('gère le passage direct au sommet', () => {
        const [c] = computeCelebrations({ previousElo: 1340, newElo: 1360 });
        expect(c.kind).toBe('grade_up');
        expect(c.detail).toContain('Grand Master');
    });
});

describe('record personnel', () => {
    it('est annoncé quand le serveur le signale', () => {
        const c = computeCelebrations({ previousElo: 1000, newElo: 1030, isRecord: true });
        expect(c.map(x => x.kind)).toContain('record');
    });

    it('n\'est jamais deviné : sans le signal, rien', () => {
        const c = computeCelebrations({ previousElo: 1000, newElo: 1030 });
        expect(c.map(x => x.kind)).not.toContain('record');
    });
});

describe('série de victoires', () => {
    it('ne se déclenche pas sous le seuil', () => {
        const c = computeCelebrations({ previousElo: 1000, newElo: 1020, winStreak: STREAK_THRESHOLD - 1 });
        expect(c.map(x => x.kind)).not.toContain('streak');
    });

    it('se déclenche au seuil', () => {
        const c = computeCelebrations({ previousElo: 1000, newElo: 1020, winStreak: STREAK_THRESHOLD });
        expect(c.map(x => x.kind)).toContain('streak');
    });
});

describe('hiérarchie et animation', () => {
    it('place les célébrations majeures en premier', () => {
        const c = computeCelebrations({
            previousElo: 890, newElo: 910, isRecord: true, isMVP: true, winStreak: 5,
        });
        expect(c[0].tier).toBe('majeur');
        expect(c[c.length - 1].tier).toBe('discret');
    });

    it('ne joue JAMAIS deux animations plein écran', () => {
        // Montée de grade ET record en même temps : deux animations existent,
        // une seule doit être retenue. Superposées, elles feraient du bruit.
        const c = computeCelebrations({ previousElo: 890, newElo: 910, isRecord: true });
        expect(c.filter(x => x.animation).length).toBeGreaterThan(1);
        expect(pickAnimation(c)).toBe('/animations/fireworks.json');
    });

    it('ne renvoie aucune animation pour une partie ordinaire', () => {
        expect(pickAnimation(computeCelebrations({ previousElo: 1000, newElo: 1010 }))).toBeNull();
    });

    it('ne renvoie aucune animation pour une simple rétrogradation', () => {
        expect(pickAnimation(computeCelebrations({ previousElo: 910, newElo: 880 }))).toBeNull();
    });
});
