/**
 * Tests du calcul ELO / MVP — scénarios nommés exigés par
 * Doc/v2-refactor/11-classement-elo.md avant toute refonte de la formule 2v2.
 *
 * ⚠️ Certains tests CARACTÉRISENT un défaut connu plutôt que de le corriger
 *    (voir « portage » plus bas). C'est volontaire : quand l'équipe tranchera
 *    la décision D10, ces tests échoueront — et c'est exactement le signal
 *    qu'on veut. Ne pas les « réparer » sans avoir changé la formule.
 */

import { describe, it, expect } from 'vitest';
import {
    getKFactor,
    calculateProbability,
    calculateEloChange1v1,
    calculateEloChange2v2,
    computeMVP,
    computeGameEloChanges,
    hasGuestPlayers,
    goalsByPlayer,
    resolvePeakElo,
    ELO_BASE,
    K_FACTOR_PLACEMENT,
    K_FACTOR_STANDARD,
    MVP_ELO_BONUS,
    type PlayerEloInput,
} from './scoring';
import type { Team, Goal, GoalPosition, GoalType } from '@/types/game';

// ─── Fabriques ───────────────────────────────────────────────────────────────

const player = (id: string) => ({ userId: id, username: id });

const team = (ids: string[], score: number): Team => ({
    players: ids.map(player),
    color: 'blue',
    score,
});

const goal = (
    scoredBy: string,
    teamIndex: 0 | 1,
    position?: GoalPosition,
    type: GoalType = 'normal'
): Goal => ({
    timestamp: new Date(0),
    type,
    position,
    scoredBy,
    scorerName: scoredBy,
    teamIndex,
    points: 1,
});

const inputs = (
    entries: Record<string, { elo?: number; gamesPlayed?: number }>
): Record<string, PlayerEloInput> =>
    Object.fromEntries(
        Object.entries(entries).map(([id, v]) => [
            id,
            { userId: id, username: id, elo: v.elo ?? ELO_BASE, gamesPlayed: v.gamesPlayed ?? 50 },
        ])
    );

// ─────────────────────────────────────────────────────────────────────────────

describe('K-factor', () => {
    it('vaut 64 pendant le placement (moins de 10 parties)', () => {
        expect(getKFactor(0)).toBe(K_FACTOR_PLACEMENT);
        expect(getKFactor(9)).toBe(K_FACTOR_PLACEMENT);
    });

    it('bascule à 32 à partir de la 10e partie', () => {
        expect(getKFactor(10)).toBe(K_FACTOR_STANDARD);
        expect(getKFactor(500)).toBe(K_FACTOR_STANDARD);
    });
});

describe('probabilité attendue', () => {
    it('vaut 50 % entre joueurs de même niveau', () => {
        expect(calculateProbability(1000, 1000)).toBeCloseTo(0.5, 10);
    });

    it('vaut 10 fois moins pour 400 points d\'écart (invariant ELO)', () => {
        expect(calculateProbability(1000, 1400)).toBeCloseTo(1 / 11, 4);
        expect(calculateProbability(1400, 1000)).toBeCloseTo(10 / 11, 4);
    });

    it('est symétrique : les deux probabilités somment à 1', () => {
        expect(calculateProbability(1234, 987) + calculateProbability(987, 1234)).toBeCloseTo(1, 10);
    });
});

describe('1v1', () => {
    it('donne ±K/2 quand les deux joueurs sont à égalité', () => {
        expect(calculateEloChange1v1(1000, 1000, 1, 50).eloChange).toBe(K_FACTOR_STANDARD / 2);
        expect(calculateEloChange1v1(1000, 1000, 0, 50).eloChange).toBe(-K_FACTOR_STANDARD / 2);
    });

    it('récompense peu le favori qui gagne, beaucoup l\'outsider', () => {
        const favoriGagne = calculateEloChange1v1(1400, 1000, 1, 50).eloChange;
        const outsiderGagne = calculateEloChange1v1(1000, 1400, 1, 50).eloChange;
        expect(favoriGagne).toBeGreaterThan(0);
        expect(outsiderGagne).toBeGreaterThan(favoriGagne * 3);
    });

    it('fait bouger un joueur en placement deux fois plus qu\'un joueur établi', () => {
        const placement = calculateEloChange1v1(1000, 1000, 1, 0).eloChange;
        const etabli = calculateEloChange1v1(1000, 1000, 1, 50).eloChange;
        expect(placement).toBe(etabli * 2);
    });
});

describe('2v2 — équipes équilibrées', () => {
    it('donne ±K/2 quand les quatre joueurs sont au même niveau', () => {
        expect(calculateEloChange2v2(1000, 1000, 1000, 1, 50).eloChange).toBe(K_FACTOR_STANDARD / 2);
        expect(calculateEloChange2v2(1000, 1000, 1000, 0, 50).eloChange).toBe(-K_FACTOR_STANDARD / 2);
    });
});

describe('2v2 — le défaut du « portage » (décision D10 en attente)', () => {
    /**
     * ⚠️ CARACTÉRISATION D'UN DÉFAUT CONNU, PAS UNE VALIDATION.
     *
     * Doc 11 : « un joueur faible porté par un partenaire fort gagne presque
     * autant que s'il avait gagné seul — sa probabilité personnelle basse
     * gonfle son gain. Le système récompense le portage. »
     *
     * Ce test fige le comportement ACTUEL. Le jour où la formule sera revue,
     * il échouera : c'est le signal attendu, pas une régression.
     */
    it('fait gagner plus de points au joueur faible qu\'à son partenaire fort', () => {
        const faible = calculateEloChange2v2(800, 1400, 1000, 1, 50).eloChange;
        const fort = calculateEloChange2v2(1400, 800, 1000, 1, 50).eloChange;
        expect(faible).toBeGreaterThan(fort);
    });

    it('récompense le joueur faible presque autant qu\'une victoire en solo', () => {
        const porte = calculateEloChange2v2(800, 1400, 1000, 1, 50).eloChange;
        const solo = calculateEloChange1v1(800, 1000, 1, 50).eloChange;
        // Moins de 40 % d'écart : le portage est à peine pénalisé. C'est le défaut.
        expect(porte).toBeGreaterThan(solo * 0.6);
    });
});

describe('MVP', () => {
    it('désigne le défenseur en clean sheet plutôt que le buteur adverse', () => {
        const teams: [Team, Team] = [team(['att', 'def'], 6), team(['x', 'y'], 0)];
        const goals = [
            goal('att', 0, 'attack'), goal('att', 0, 'attack'), goal('att', 0, 'attack'),
            goal('att', 0, 'attack'), goal('att', 0, 'attack'), goal('att', 0, 'attack'),
        ];
        // def n'a pas marqué → défenseur, clean sheet → 95
        // att a marqué 6/6 depuis l'attaque → 6/6 × 90 = 90
        expect(computeMVP(teams, goals, 0)).toBe('def');
    });

    it('peut désigner un joueur qui n\'a marqué aucun but', () => {
        const teams: [Team, Team] = [team(['att', 'def'], 6), team(['x', 'y'], 0)];
        const goals = Array.from({ length: 6 }, () => goal('att', 0, 'attack'));
        const mvp = computeMVP(teams, goals, 0);
        expect(goalsByPlayer(goals)[mvp!] ?? 0).toBe(0);
    });

    it('départage une égalité en faveur de l\'équipe gagnante', () => {
        // Aucun but marqué depuis 'attack' → tout le monde est défenseur.
        // Les deux équipes encaissent... des scores différents, donc on force
        // l'égalité avec un score identique impossible : on teste via 1v1 symétrique.
        const teams: [Team, Team] = [team(['gagnant'], 5), team(['perdant'], 5)];
        const goals: Goal[] = [];
        // scores défensifs identiques (5 encaissés chacun sur target 5 → 0)
        expect(computeMVP(teams, goals, 0)).toBe('gagnant');
    });

    it('ignore les invités', () => {
        const teams: [Team, Team] = [team(['guest_1', 'vrai'], 6), team(['x', 'y'], 0)];
        const goals = Array.from({ length: 6 }, () => goal('guest_1', 0, 'attack'));
        expect(computeMVP(teams, goals, 0)).not.toBe('guest_1');
    });

    it('ne désigne personne sur une partie sans le moindre but', () => {
        expect(computeMVP([team(['a'], 0), team(['b'], 0)], [], 0)).toBeNull();
    });
});

describe('computeGameEloChanges — intégration', () => {
    const teams: [Team, Team] = [team(['a1', 'a2'], 6), team(['b1', 'b2'], 3)];
    const goals = [
        goal('a1', 0, 'attack'), goal('a1', 0, 'attack'), goal('a1', 0, 'attack'),
        goal('a1', 0, 'attack'), goal('a1', 0, 'attack'), goal('a1', 0, 'attack'),
        goal('b1', 1, 'attack'), goal('b1', 1, 'attack'), goal('b1', 1, 'attack'),
    ];
    const players = inputs({ a1: {}, a2: {}, b1: {}, b2: {} });

    it('produit une entrée par joueur', () => {
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, players);
        expect(Object.keys(eloChanges).sort()).toEqual(['a1', 'a2', 'b1', 'b2']);
    });

    it('fait gagner des points aux vainqueurs et en fait perdre aux perdants', () => {
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, players);
        expect(eloChanges.a1.eloChange).toBeGreaterThan(0);
        expect(eloChanges.a2.eloChange).toBeGreaterThan(0);
        expect(eloChanges.b1.eloChange).toBeLessThan(0);
        expect(eloChanges.b2.eloChange).toBeLessThan(0);
    });

    it('applique le bonus MVP exactement une fois', () => {
        const { eloChanges, mvpId } = computeGameEloChanges(teams, goals, 0, players);
        const mvp = eloChanges[mvpId!];
        const nonMvp = Object.entries(eloChanges).find(([id]) => id !== mvpId)![1];

        // Les deux gagnants ont la même variation de base ; seul le MVP a le bonus.
        if (mvpId === 'a1' || mvpId === 'a2') {
            expect(mvp.eloChange - nonMvp.eloChange).toBe(MVP_ELO_BONUS);
        }
        expect(mvp.isMVP).toBe(true);
    });

    it('garantit newElo === previousElo + eloChange pour tout le monde', () => {
        // C'est l'invariant qui empêche affichage et stockage de diverger (chantier 1.3).
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, players);
        for (const change of Object.values(eloChanges)) {
            expect(change.newElo).toBe(change.previousElo + change.eloChange);
        }
    });

    it('ne compte qu\'un seul MVP', () => {
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, players);
        expect(Object.values(eloChanges).filter(c => c.isMVP)).toHaveLength(1);
    });

    it('n\'attribue rien du tout si la partie contient un invité', () => {
        const avecInvite: [Team, Team] = [team(['a1', 'guest_x'], 6), team(['b1', 'b2'], 3)];
        const { eloChanges, mvpId } = computeGameEloChanges(avecInvite, goals, 0, players);
        expect(eloChanges).toEqual({});
        expect(mvpId).toBeNull();
        expect(hasGuestPlayers(avecInvite)).toBe(true);
    });

    it('traite un joueur inconnu comme un débutant à 1000 en placement', () => {
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, inputs({ a1: {}, b1: {}, b2: {} }));
        // a2 est absent des inputs → ELO_BASE et K de placement
        expect(eloChanges.a2.previousElo).toBe(ELO_BASE);
        expect(Math.abs(eloChanges.a2.eloChange)).toBeGreaterThan(Math.abs(eloChanges.a1.eloChange));
    });

    it('gère le 1v1 (le commentaire « seulement en 2v2 » était faux)', () => {
        const solo: [Team, Team] = [team(['a'], 6), team(['b'], 2)];
        const soloGoals = Array.from({ length: 6 }, () => goal('a', 0, 'attack'));
        const { eloChanges } = computeGameEloChanges(solo, soloGoals, 0, inputs({ a: {}, b: {} }));
        expect(eloChanges.a.eloChange).toBeGreaterThan(0);
        expect(eloChanges.b.eloChange).toBeLessThan(0);
    });
});

describe('inflation assumée', () => {
    /**
     * Doc 11 : le système CRÉE des points, et c'est voulu. Le soft reset
     * saisonnier est la contrepartie. Ce test documente l'inflation pour
     * qu'aucun contributeur ne la prenne pour un bug.
     */
    it('crée des points : la somme des variations est positive grâce au bonus MVP', () => {
        const teams: [Team, Team] = [team(['a1', 'a2'], 6), team(['b1', 'b2'], 3)];
        const goals = Array.from({ length: 6 }, () => goal('a1', 0, 'attack'));
        const { eloChanges } = computeGameEloChanges(teams, goals, 0, inputs({ a1: {}, a2: {}, b1: {}, b2: {} }));
        const somme = Object.values(eloChanges).reduce((s, c) => s + c.eloChange, 0);
        expect(somme).toBe(MVP_ELO_BONUS);
    });
});

describe('resolvePeakElo — le pic reconstitué', () => {
    it('reconstitue le pic depuis eloHistory quand peakElo n\'existe pas', () => {
        // Le cas des 147 comptes créés avant le suivi explicite.
        expect(resolvePeakElo({
            elo: 1050,
            eloHistory: [
                { date: 'a', elo: 1000 },
                { date: 'b', elo: 1180 },
                { date: 'c', elo: 1050 },
            ],
        })).toBe(1180);
    });

    it('prend le maximum des trois sources', () => {
        expect(resolvePeakElo({ elo: 1300, peakElo: 1200, eloHistory: [{ date: 'a', elo: 1250 }] })).toBe(1300);
        expect(resolvePeakElo({ elo: 1100, peakElo: 1400, eloHistory: [{ date: 'a', elo: 1250 }] })).toBe(1400);
    });

    it('retombe sur l\'ELO courant quand il n\'y a aucun historique', () => {
        expect(resolvePeakElo({ elo: 1234 })).toBe(1234);
    });

    it('ne renvoie jamais moins que la base, même sur un profil vide', () => {
        expect(resolvePeakElo({})).toBe(ELO_BASE);
        expect(resolvePeakElo(null)).toBe(ELO_BASE);
    });

    it('ignore les entrées d\'historique corrompues', () => {
        expect(resolvePeakElo({
            elo: 1000,
            eloHistory: [
                { date: 'a', elo: 1200 },
                { date: 'b' } as unknown as { date: string; elo: number },
            ],
        })).toBe(1200);
    });
});
