/**
 * Tests de l'évolution au classement.
 *
 * La date du jour est injectée : sans ça, les tests dépendraient du moment où
 * on les lance et casseraient une semaine plus tard.
 */

import { describe, it, expect } from 'vitest';
import { computeMovements, eloAsOf, shiftDate, type RankedPlayer } from './ranking';

const TODAY = '2026-08-21';
const LAST_WEEK = '2026-08-14';

const player = (userId: string, elo: number, history: [string, number][]): RankedPlayer => ({
    userId,
    elo,
    history: Object.fromEntries(history.map(([date, e]) => [date, { date, elo: e }])),
});

describe('shiftDate', () => {
    it('recule d\'une semaine', () => {
        expect(shiftDate(TODAY, -7)).toBe(LAST_WEEK);
    });

    it('franchit un changement de mois', () => {
        expect(shiftDate('2026-09-03', -7)).toBe('2026-08-27');
    });
});

describe('eloAsOf', () => {
    it('prend la dernière entrée antérieure ou égale à la date', () => {
        const p = player('a', 1200, [['2026-08-10', 1100], ['2026-08-14', 1150], ['2026-08-20', 1200]]);
        expect(eloAsOf(p, LAST_WEEK)).toBe(1150);
    });

    it('prend la dernière entrée ANTÉRIEURE quand le joueur n\'a pas joué cette semaine-là', () => {
        // Le cas d'un joueur inactif : son ELO d'il y a une semaine est bien
        // celui de sa dernière partie, même ancienne.
        const p = player('a', 1100, [['2026-07-01', 1100]]);
        expect(eloAsOf(p, LAST_WEEK)).toBe(1100);
    });

    it('retourne null quand le joueur n\'était pas encore classé', () => {
        const p = player('a', 1050, [['2026-08-20', 1050]]);
        expect(eloAsOf(p, LAST_WEEK)).toBeNull();
    });

    it('ignore les entrées sans ELO', () => {
        const p: RankedPlayer = { userId: 'a', elo: 1000, history: { x: { date: '2026-08-01' } } };
        expect(eloAsOf(p, LAST_WEEK)).toBeNull();
    });
});

describe('computeMovements', () => {
    it('détecte une montée', () => {
        // b était 2e (1100 contre 1200), il est maintenant 1er.
        const players = [
            player('b', 1300, [['2026-08-10', 1100], ['2026-08-20', 1300]]),
            player('a', 1200, [['2026-08-10', 1200]]),
        ];
        const m = computeMovements(players, TODAY);
        expect(m.b).toEqual({ kind: 'up', places: 1 });
        expect(m.a).toEqual({ kind: 'down', places: 1 });
    });

    it('détecte l\'absence de mouvement', () => {
        const players = [
            player('a', 1200, [['2026-08-10', 1200]]),
            player('b', 1100, [['2026-08-10', 1100]]),
        ];
        const m = computeMovements(players, TODAY);
        expect(m.a).toEqual({ kind: 'same' });
        expect(m.b).toEqual({ kind: 'same' });
    });

    it('marque « nouveau » un joueur sans historique à la date de coupe', () => {
        // Dire « stable » d'un joueur qui n'existait pas serait faux.
        const players = [
            player('a', 1200, [['2026-08-10', 1200]]),
            player('nouveau', 1100, [['2026-08-20', 1100]]),
        ];
        expect(computeMovements(players, TODAY).nouveau).toEqual({ kind: 'new' });
    });

    it('compte le nombre exact de places gagnées', () => {
        // c passe de la 3e à la 1re place.
        const players = [
            player('c', 1400, [['2026-08-10', 1000], ['2026-08-20', 1400]]),
            player('a', 1200, [['2026-08-10', 1200]]),
            player('b', 1100, [['2026-08-10', 1100]]),
        ];
        expect(computeMovements(players, TODAY).c).toEqual({ kind: 'up', places: 2 });
    });

    it('ne compte que les joueurs classés à l\'époque dans le classement passé', () => {
        // `nouveau` n'existait pas : il ne doit pas décaler les rangs d'alors.
        const players = [
            player('nouveau', 1500, [['2026-08-20', 1500]]),
            player('a', 1200, [['2026-08-10', 1200]]),
            player('b', 1100, [['2026-08-10', 1100]]),
        ];
        const m = computeMovements(players, TODAY);
        // a était 1er et le reste... en 2e position affichée, donc il descend d'un rang.
        expect(m.a).toEqual({ kind: 'down', places: 1 });
        expect(m.nouveau).toEqual({ kind: 'new' });
    });

    it('renvoie une entrée pour chaque joueur, sans exception', () => {
        const players = [player('a', 1200, []), player('b', 1100, [['2026-08-01', 1100]])];
        const m = computeMovements(players, TODAY);
        expect(Object.keys(m).sort()).toEqual(['a', 'b']);
    });
});
