import { describe, it, expect } from 'vitest';
import {
    isInPlacement,
    placementProgress,
    eloMultiplier,
    appearsInLeaderboard,
    displayElo,
    PARTIES_DE_PLACEMENT,
    MULTIPLICATEUR_PLACEMENT,
    type PlacementState,
} from './placement';

const etat = (seasonGames: number, playedPreviousSeason = true): PlacementState =>
    ({ seasonGames, playedPreviousSeason });

describe('les réglages', () => {
    it('trois parties de placement', () => {
        expect(PARTIES_DE_PLACEMENT).toBe(3);
    });

    it('l\'ELO bouge deux fois plus fort', () => {
        expect(MULTIPLICATEUR_PLACEMENT).toBe(2);
    });
});

describe('isInPlacement', () => {
    it('vrai tant que les trois parties ne sont pas faites', () => {
        expect(isInPlacement(etat(0))).toBe(true);
        expect(isInPlacement(etat(2))).toBe(true);
    });

    it('faux à la troisième — le placement se termine AVEC elle, pas après', () => {
        expect(isInPlacement(etat(3))).toBe(false);
    });

    it('reste faux ensuite', () => {
        expect(isInPlacement(etat(50))).toBe(false);
    });

    it('un compteur négatif ne bloque pas quelqu\'un en placement à vie', () => {
        expect(isInPlacement(etat(-5))).toBe(true);
        expect(placementProgress(etat(-5)).done).toBe(0);
    });
});

describe('placementProgress — ce qui remplace le rang', () => {
    it('affiche « 0 / 3 » avant la première partie', () => {
        expect(placementProgress(etat(0)).label).toBe('0 / 3');
    });

    it('avance à chaque partie', () => {
        expect(placementProgress(etat(1)).label).toBe('1 / 3');
        expect(placementProgress(etat(2)).remaining).toBe(1);
    });

    it('ne dépasse jamais le total, même après coup', () => {
        expect(placementProgress(etat(9)).label).toBe('3 / 3');
        expect(placementProgress(etat(9)).remaining).toBe(0);
    });
});

describe('eloMultiplier', () => {
    it('double le mouvement pendant le placement', () => {
        expect(eloMultiplier(etat(0))).toBe(2);
        expect(eloMultiplier(etat(2))).toBe(2);
    });

    it('revient à la normale ensuite', () => {
        expect(eloMultiplier(etat(3))).toBe(1);
    });

    it('renvoie un NOMBRE, pour qu\'un placement progressif ne change que cette fonction', () => {
        expect(typeof eloMultiplier(etat(0))).toBe('number');
    });
});

describe('appearsInLeaderboard — le classement ne doit pas paraître vide', () => {
    it('un ancien joueur reste visible dès le premier jour', () => {
        // Décision de Sacha (22/08) : sinon le classement serait quasi vide au
        // lancement de la saison 1, et on croirait que tout le monde est parti.
        expect(appearsInLeaderboard(etat(0, true))).toBe(true);
    });

    it('un joueur qui n\'a jamais joué n\'apparaît pas', () => {
        expect(appearsInLeaderboard(etat(0, false))).toBe(false);
    });

    it('mais il apparaît dès sa première partie', () => {
        expect(appearsInLeaderboard(etat(1, false))).toBe(false);
        expect(appearsInLeaderboard(etat(3, false))).toBe(true);
    });

    it('un ancien joueur reste visible pendant tout son placement', () => {
        for (const n of [0, 1, 2, 3, 10]) {
            expect(appearsInLeaderboard(etat(n, true))).toBe(true);
        }
    });
});

describe('displayElo — masqué tant qu\'il ne veut rien dire', () => {
    it('null pendant le placement', () => {
        expect(displayElo(1180, etat(0))).toBeNull();
        expect(displayElo(1180, etat(2))).toBeNull();
    });

    it('affiché une fois le placement terminé', () => {
        expect(displayElo(1180, etat(3))).toBe(1180);
    });

    it('l\'ELO EXISTE pendant le placement, il n\'est que masqué', () => {
        // Il continue de bouger, et c'est bien le but : à la troisième partie,
        // il est déjà proche du niveau réel.
        expect(eloMultiplier(etat(1))).toBe(2);
        expect(displayElo(1180, etat(1))).toBeNull();
    });
});
