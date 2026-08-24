import { describe, expect, it } from 'vitest';
import type { Game } from '@/types/game';
import { calculateAdvancedStats } from './statsCalculator';

/**
 * Le filtre par saison — chantier 3.8.
 *
 * Ce qui compte ici n'est pas le detail des statistiques, deja couvert
 * ailleurs, mais QUELLES PARTIES entrent dans le calcul. Une erreur de filtre
 * ne se voit pas : elle donne un profil plausible, simplement faux.
 */

const MOI = 'moi';

/** Une partie terminee, gagnee par l'equipe de `MOI`. */
const partie = (seasonId: string | undefined, id: string): Game => ({
    gameId: id,
    venueId: 'stade',
    venueName: 'Stade',
    teams: [
        { players: [{ userId: MOI, username: 'Moi', avatarUrl: null }], color: 'blue', score: 6 },
        { players: [{ userId: 'autre', username: 'Autre', avatarUrl: null }], color: 'red', score: 2 },
    ],
    score: [6, 2],
    multiplier: 1,
    startTime: new Date('2026-01-01'),
    startedAt: new Date('2026-01-01'),
    duration: 300,
    status: 'completed',
    goals: [],
    winner: 0,
    playerIds: [MOI, 'autre'],
    hostId: MOI,
    ...(seasonId ? { seasonId } : {}),
} as unknown as Game);

const parties = [
    partie('season_0', 'a'),
    partie('season_0', 'b'),
    partie('season_1', 'c'),
    partie(undefined, 'd'),   // partie d'avant le rattachement
];

describe('filtre par saison', () => {
    it('sans filtre, toutes les parties comptent', () => {
        expect(calculateAdvancedStats(parties, MOI).totalGames).toBe(4);
    });

    it("'all' vaut l'absence de filtre", () => {
        expect(calculateAdvancedStats(parties, MOI, { seasonId: 'all' }).totalGames).toBe(4);
    });

    it('une saison ne retient que ses parties', () => {
        expect(calculateAdvancedStats(parties, MOI, { seasonId: 'season_1' }).totalGames).toBe(1);
    });

    it('une partie SANS saison compte pour la saison 0', () => {
        // Deux parties marquees `season_0`, plus celle qui n'a rien : trois.
        // C'est la regle du rattachement -- la saison 0 est la periode ecoulee
        // jusqu'a la premiere cloture, donc tout ce qui precede lui appartient.
        expect(calculateAdvancedStats(parties, MOI, { seasonId: 'season_0' }).totalGames).toBe(3);
    });

    it('une saison sans partie donne un profil vide, pas une erreur', () => {
        expect(calculateAdvancedStats(parties, MOI, { seasonId: 'season_9' }).totalGames).toBe(0);
    });

    it('le filtre de saison se combine avec celui de stade', () => {
        const ailleurs = { ...partie('season_1', 'e'), venueId: 'autre-stade' } as Game;
        const stats = calculateAdvancedStats([...parties, ailleurs], MOI, {
            seasonId: 'season_1',
            venueId: 'stade',
        });
        expect(stats.totalGames).toBe(1);
    });
});
