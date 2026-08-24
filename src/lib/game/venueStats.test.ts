import { describe, it, expect } from 'vitest';
import {
    accumulateVenue,
    countersFor,
    winRateOf,
    isRealVenue,
    type VenueStats,
} from './venueStats';

describe('isRealVenue', () => {
    it('accepte un identifiant normal', () => {
        expect(isRealVenue('AMYHJzZINQqobab7LW')).toBe(true);
    });

    it('refuse « none » — cinq parties de production le portent sans stade réel', () => {
        expect(isRealVenue('none')).toBe(false);
    });

    it('refuse l\'absence de stade', () => {
        expect(isRealVenue(undefined)).toBe(false);
        expect(isRealVenue(null)).toBe(false);
        expect(isRealVenue('')).toBe(false);
    });

    it('refuse ce qui casserait un chemin de champ Firestore', () => {
        expect(isRealVenue('a.b')).toBe(false);
        expect(isRealVenue('a/b')).toBe(false);
    });
});

describe('accumulateVenue', () => {
    it('crée les compteurs à la première partie', () => {
        expect(accumulateVenue(undefined, 'bar', { won: true, goalsScored: 3 }))
            .toEqual({ bar: { games: 1, wins: 1, goalsScored: 3 } });
    });

    it('cumule les parties suivantes', () => {
        let v: VenueStats = accumulateVenue(undefined, 'bar', { won: true, goalsScored: 3 });
        v = accumulateVenue(v, 'bar', { won: false, goalsScored: 1 });
        expect(v.bar).toEqual({ games: 2, wins: 1, goalsScored: 4 });
    });

    it('sépare bien deux stades', () => {
        let v: VenueStats = accumulateVenue(undefined, 'bar', { won: true, goalsScored: 2 });
        v = accumulateVenue(v, 'club', { won: true, goalsScored: 5 });
        expect(v.bar.games).toBe(1);
        expect(v.club.goalsScored).toBe(5);
    });

    it('ne mute jamais la carte reçue', () => {
        const origine: VenueStats = { bar: { games: 1, wins: 1, goalsScored: 2 } };
        accumulateVenue(origine, 'bar', { won: true, goalsScored: 4 });
        expect(origine.bar.games).toBe(1);
    });

    it('un stade absent ou « none » laisse tout intact', () => {
        const origine: VenueStats = { bar: { games: 2, wins: 1, goalsScored: 3 } };
        expect(accumulateVenue(origine, 'none', { won: true, goalsScored: 9 })).toEqual(origine);
        expect(accumulateVenue(origine, undefined, { won: true, goalsScored: 9 })).toEqual(origine);
    });

    it('un nombre de buts absurde ne fait jamais reculer le compteur', () => {
        const v = accumulateVenue(undefined, 'bar', { won: false, goalsScored: -5 });
        expect(v.bar.goalsScored).toBe(0);
    });
});

describe('countersFor et winRateOf', () => {
    const v: VenueStats = { bar: { games: 4, wins: 3, goalsScored: 12 } };

    it('renvoie les compteurs du stade', () => {
        expect(countersFor(v, 'bar')).toEqual({ games: 4, wins: 3, goalsScored: 12 });
    });

    it('un stade jamais joué vaut zéro, pas undefined', () => {
        expect(countersFor(v, 'inconnu')).toEqual({ games: 0, wins: 0, goalsScored: 0 });
        expect(countersFor(undefined, 'bar').games).toBe(0);
    });

    it('le taux de victoire ne divise jamais par zéro', () => {
        expect(winRateOf({ games: 0, wins: 0, goalsScored: 0 })).toBe(0);
        expect(winRateOf({ games: 4, wins: 3, goalsScored: 0 })).toBe(0.75);
    });
});
