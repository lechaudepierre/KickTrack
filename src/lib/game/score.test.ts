import { describe, it, expect } from 'vitest';
import { scoreFromTeams, scoresAgree, winnerFromTeams } from './score';

describe('scoreFromTeams — la seule façon de construire le tableau', () => {
    it('reprend les scores des deux équipes, dans l\'ordre', () => {
        expect(scoreFromTeams([{ score: 6 }, { score: 3 }])).toEqual([6, 3]);
    });

    it('un score absent vaut zéro, jamais NaN', () => {
        // Un NaN se propagerait dans les comparaisons de vainqueur, sans erreur.
        expect(scoreFromTeams([{} as never, { score: 2 }])).toEqual([0, 2]);
        expect(scoreFromTeams([])).toEqual([0, 0]);
    });

    it('une valeur absurde vaut zéro aussi', () => {
        expect(scoreFromTeams([{ score: NaN }, { score: Infinity }])).toEqual([0, 0]);
    });

    it('ignore une troisième équipe, s\'il en traînait une', () => {
        expect(scoreFromTeams([{ score: 1 }, { score: 2 }, { score: 9 }])).toEqual([1, 2]);
    });
});

describe('scoresAgree — repérer une divergence héritée', () => {
    const teams = [{ score: 6 }, { score: 3 }];

    it('vrai quand les deux copies disent la même chose', () => {
        expect(scoresAgree(teams, [6, 3])).toBe(true);
    });

    it('faux dès qu\'un chiffre diffère', () => {
        expect(scoresAgree(teams, [6, 4])).toBe(false);
        expect(scoresAgree(teams, [3, 6])).toBe(false);
    });

    it('faux si la copie est absente ou tronquée', () => {
        expect(scoresAgree(teams, undefined)).toBe(false);
        expect(scoresAgree(teams, [6])).toBe(false);
    });
});

describe('winnerFromTeams', () => {
    it('désigne l\'équipe qui mène', () => {
        expect(winnerFromTeams([{ score: 6 }, { score: 3 }])).toBe(0);
        expect(winnerFromTeams([{ score: 2 }, { score: 5 }])).toBe(1);
    });

    it('null en cas d\'égalité — une partie nulle n\'a pas de vainqueur', () => {
        expect(winnerFromTeams([{ score: 4 }, { score: 4 }])).toBeNull();
        expect(winnerFromTeams([{ score: 0 }, { score: 0 }])).toBeNull();
    });

    it('reste cohérent avec le tableau dérivé', () => {
        const teams = [{ score: 7 }, { score: 5 }];
        const [a, b] = scoreFromTeams(teams);
        expect(winnerFromTeams(teams)).toBe(a > b ? 0 : 1);
    });
});
