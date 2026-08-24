import { describe, it, expect } from 'vitest';
import {
    applyEloReset,
    preservesOrder,
    previewReset,
    RESET_SAISON_1,
    type EloResetConfig,
} from './seasonReset';

describe('la compression retenue pour la saison 1', () => {
    it('est bien un facteur 0,5', () => {
        expect(RESET_SAISON_1).toEqual({ mode: 'compress', k: 0.5 });
    });

    it('divise l\'écart au centre par deux', () => {
        expect(applyEloReset(1350)).toBe(1175);
        expect(applyEloReset(850)).toBe(925);
    });

    it('laisse le centre exactement où il est', () => {
        expect(applyEloReset(1000)).toBe(1000);
    });

    it('rapproche tout le monde, dans les deux sens', () => {
        expect(applyEloReset(1200)).toBeLessThan(1200);
        expect(applyEloReset(800)).toBeGreaterThan(800);
    });

    it('arrondit : un ELO à virgule n\'a aucun sens et se propagerait', () => {
        expect(Number.isInteger(applyEloReset(1233))).toBe(true);
        expect(applyEloReset(1233)).toBe(1117);
    });
});

describe('l\'ordre du classement', () => {
    it('est préservé : personne ne double personne', () => {
        const avant = [1350, 1200, 1100, 1000, 900, 850];
        const apres = avant.map(e => applyEloReset(e));
        for (let i = 1; i < apres.length; i++) {
            expect(apres[i - 1]).toBeGreaterThan(apres[i]);
        }
    });

    it('deux joueurs proches le restent, sans jamais s\'inverser', () => {
        expect(applyEloReset(1201)).toBeGreaterThan(applyEloReset(1199));
    });

    it('`preservesOrder` le dit pour tout facteur positif', () => {
        expect(preservesOrder({ mode: 'compress', k: 0.5 })).toBe(true);
        expect(preservesOrder({ mode: 'compress', k: 0.1 })).toBe(true);
        expect(preservesOrder({ mode: 'keep' })).toBe(true);
    });

    it('et signale que « tout à 1000 » l\'écrase', () => {
        expect(preservesOrder({ mode: 'reset' })).toBe(false);
    });

    it('un facteur négatif INVERSERAIT le classement — le garde-fou le voit', () => {
        // Ce serait un bug muet : il ne se verrait qu'au classement du lendemain.
        expect(preservesOrder({ mode: 'compress', k: -0.5 })).toBe(false);
    });
});

describe('les autres réglages', () => {
    it('« reset » ramène tout le monde à 1000', () => {
        for (const e of [1350, 1000, 700]) {
            expect(applyEloReset(e, { mode: 'reset' })).toBe(1000);
        }
    });

    it('« keep » ne touche à rien', () => {
        expect(applyEloReset(1287, { mode: 'keep' })).toBe(1287);
    });

    it('un facteur 1 équivaut à ne rien faire', () => {
        expect(applyEloReset(1350, { mode: 'compress', k: 1 })).toBe(1350);
    });

    it('un facteur 0 équivaut à tout remettre à plat', () => {
        expect(applyEloReset(1350, { mode: 'compress', k: 0 })).toBe(1000);
    });
});

describe('robustesse', () => {
    it('une valeur absente ou absurde retombe sur la base', () => {
        expect(applyEloReset(NaN)).toBe(1000);
        expect(applyEloReset(Infinity)).toBe(1000);
    });

    it('un ELO très bas ne devient jamais négatif après compression', () => {
        expect(applyEloReset(0)).toBe(500);
    });
});

describe('previewReset — le contrôle à blanc', () => {
    const joueurs = [
        { userId: 'a', username: 'Petit', elo: 900 },
        { userId: 'b', username: 'Gros', elo: 1350 },
        { userId: 'c', username: 'Moyen', elo: 1050 },
    ];

    it('trie du meilleur au moins bon, comme le classement', () => {
        expect(previewReset(joueurs).map(p => p.username)).toEqual(['Gros', 'Moyen', 'Petit']);
    });

    it('montre l\'avant et l\'après pour chacun', () => {
        const gros = previewReset(joueurs)[0];
        expect(gros).toEqual({ userId: 'b', username: 'Gros', before: 1350, after: 1175 });
    });

    it('ne modifie jamais la liste reçue', () => {
        const copie: EloResetConfig = { mode: 'compress', k: 0.5 };
        previewReset(joueurs, copie);
        expect(joueurs[0].elo).toBe(900);
    });
});
