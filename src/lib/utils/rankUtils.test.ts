/**
 * Tests de la progression de grade.
 *
 * Seuils (voir la table en tête de rankUtils) :
 *   Argent III <700, II 700-799, I 800-899
 *   Or III 900-949, II 950-999, I 1000-1049
 *   Diamant III 1050-1099, II 1100-1149, I 1150-1199
 *   Master III 1200-1249, II 1250-1299, I 1300-1349
 *   GrandMaster III 1350-1449, II 1450-1599, I 1600+
 */

import { describe, it, expect } from 'vitest';
import { getRankProgress, getRankInfo } from './rankUtils';

describe('getRankProgress', () => {
    it('donne les points restants avant le palier suivant', () => {
        const p = getRankProgress(1049);
        expect(p.current.label).toBe('Or');
        expect(p.current.romanLevel).toBe('I');
        expect(p.nextThreshold).toBe(1050);
        expect(p.pointsToNext).toBe(1);
        expect(p.next?.label).toBe('Diamant');
    });

    it('place un joueur juste au seuil au début du nouveau palier', () => {
        const p = getRankProgress(1050);
        expect(p.current.label).toBe('Diamant');
        expect(p.ratio).toBe(0);
        expect(p.pointsToNext).toBe(50);
    });

    it('calcule un avancement à mi-palier', () => {
        // Diamant III : 1050 -> 1100. À 1075, on est à la moitié.
        expect(getRankProgress(1075).ratio).toBeCloseTo(0.5, 5);
    });

    it('garde l\'avancement entre 0 et 1 sur toute l\'échelle', () => {
        for (let elo = 0; elo <= 2000; elo += 17) {
            const r = getRankProgress(elo).ratio;
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(1);
        }
    });

    it('ne propose pas de suite au sommet', () => {
        const p = getRankProgress(1700);
        expect(p.current.label).toBe('Grand Master');
        expect(p.current.romanLevel).toBe('I');
        expect(p.next).toBeNull();
        expect(p.pointsToNext).toBeNull();
        // Une barre qui ne se remplirait jamais serait décourageante : au
        // sommet, elle est pleine.
        expect(p.ratio).toBe(1);
    });

    it('gère un joueur tout en bas de l\'échelle', () => {
        const p = getRankProgress(0);
        expect(p.current.label).toBe('Argent');
        expect(p.ratio).toBe(0);
        expect(p.pointsToNext).toBe(700);
    });

    it('reste cohérent avec getRankInfo sur toute l\'échelle', () => {
        for (let elo = 0; elo <= 2000; elo += 13) {
            expect(getRankProgress(elo).current).toEqual(getRankInfo(elo));
        }
    });
});
