import { describe, it, expect } from 'vitest';
import { toMillis, toDate, gameStartMs } from './dates';

const T = 1_700_000_000_000;

describe('toMillis — les trois formes venues de Firestore', () => {
    it('accepte une Date', () => {
        expect(toMillis(new Date(T))).toBe(T);
    });

    it('accepte un Timestamp du SDK', () => {
        expect(toMillis({ toDate: () => new Date(T) })).toBe(T);
    });

    it('accepte un Timestamp sérialisé, qui n\'a plus que `seconds`', () => {
        expect(toMillis({ seconds: T / 1000 })).toBe(T);
    });

    it('accepte une chaîne ISO, forme des réponses d\'API', () => {
        expect(toMillis(new Date(T).toISOString())).toBe(T);
    });

    it('accepte un nombre déjà en millisecondes', () => {
        expect(toMillis(T)).toBe(T);
    });
});

describe('toMillis — zéro plutôt que NaN', () => {
    it('une valeur absente vaut zéro', () => {
        // Un NaN ne lève rien : il se propage dans les tris et les durées, et
        // produit un résultat faux sans erreur.
        expect(toMillis(null)).toBe(0);
        expect(toMillis(undefined)).toBe(0);
    });

    it('une Date invalide vaut zéro', () => {
        expect(toMillis(new Date('pas une date'))).toBe(0);
    });

    it('une chaîne illisible vaut zéro', () => {
        expect(toMillis('n\'importe quoi')).toBe(0);
    });

    it('un objet sans forme reconnue vaut zéro', () => {
        expect(toMillis({} as never)).toBe(0);
        expect(toMillis({ seconds: 'douze' } as never)).toBe(0);
    });

    it('jamais de NaN, quelle que soit l\'entrée', () => {
        for (const v of [null, undefined, {}, '', 'abc', NaN, Infinity, new Date('x')]) {
            expect(Number.isNaN(toMillis(v as never))).toBe(false);
        }
    });
});

describe('toDate', () => {
    it('rend une Date exploitable', () => {
        expect(toDate({ seconds: T / 1000 }).getTime()).toBe(T);
    });

    it('rend l\'époque pour une valeur inexploitable, jamais une Date invalide', () => {
        expect(Number.isNaN(toDate(undefined).getTime())).toBe(false);
    });
});

describe('gameStartMs — `startedAt` et `startTime` sont le même champ', () => {
    it('`startedAt` fait foi', () => {
        expect(gameStartMs({ startedAt: new Date(T), startTime: new Date(0) })).toBe(T);
    });

    it('mais `startTime` sert de repli', () => {
        expect(gameStartMs({ startTime: new Date(T) })).toBe(T);
    });

    it('les deux formes peuvent différer sans que ça pose problème', () => {
        expect(gameStartMs({ startedAt: { seconds: T / 1000 } })).toBe(T);
    });

    it('une partie sans aucune des deux vaut zéro', () => {
        expect(gameStartMs({})).toBe(0);
        expect(gameStartMs(undefined as never)).toBe(0);
    });
});
