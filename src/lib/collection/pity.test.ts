import { describe, expect, it } from 'vitest';
import type { CatalogItem, Rarity } from '@/types/collection';
import {
    PITY_INITIAL,
    SEUIL_PITY,
    garantieDue,
    lirePity,
    pityApres,
    poolPourCeTirage,
} from './pity';

const item = (id: string, rarity: Rarity): CatalogItem =>
    ({ id, rarity, type: 'banner' }) as CatalogItem;

const POOL = [
    item('c1', 'commun'),
    item('r1', 'rare'),
    item('e1', 'epique'),
    item('l1', 'legendaire'),
    item('l2', 'legendaire'),
];

describe('lirePity', () => {
    it('un profil sans compteur part de zero', () => {
        expect(lirePity(undefined)).toEqual({ depuisLegendaire: 0 });
    });

    it('une valeur absurde vaut zero plutot que de propager n importe quoi', () => {
        expect(lirePity({ depuisLegendaire: -3 })).toEqual({ depuisLegendaire: 0 });
        expect(lirePity({ depuisLegendaire: 'douze' })).toEqual({ depuisLegendaire: 0 });
    });

    it('lit un compteur valide', () => {
        expect(lirePity({ depuisLegendaire: 4 })).toEqual({ depuisLegendaire: 4 });
    });
});

describe('garantieDue', () => {
    it('les quatre premiers packs tirent normalement', () => {
        for (let n = 0; n < SEUIL_PITY - 1; n++) {
            expect(garantieDue({ depuisLegendaire: n })).toBe(false);
        }
    });

    it('le cinquieme garantit', () => {
        expect(garantieDue({ depuisLegendaire: SEUIL_PITY - 1 })).toBe(true);
    });

    it('reste due si le compteur a depasse le seuil', () => {
        // Ne devrait pas arriver, mais un compteur bloque au-dessus du seuil
        // doit se resoudre, pas se figer.
        expect(garantieDue({ depuisLegendaire: 99 })).toBe(true);
    });

    it('un seuil nul ou negatif desactive la garantie', () => {
        expect(garantieDue({ depuisLegendaire: 50 }, 0)).toBe(false);
        expect(garantieDue({ depuisLegendaire: 50 }, -1)).toBe(false);
    });
});

describe('pityApres', () => {
    it('un tirage non legendaire avance le compteur', () => {
        expect(pityApres({ depuisLegendaire: 2 }, 'epique')).toEqual({ depuisLegendaire: 3 });
    });

    it('un legendaire remet a zero', () => {
        expect(pityApres({ depuisLegendaire: 4 }, 'legendaire')).toEqual({ depuisLegendaire: 0 });
    });

    it('un legendaire tire par CHANCE remet aussi a zero', () => {
        // Sinon la garantie se declencherait juste apres un coup de chance,
        // et donnerait deux legendaires coup sur coup.
        expect(pityApres({ depuisLegendaire: 1 }, 'legendaire')).toEqual({ depuisLegendaire: 0 });
    });

    it('une rarete inconnue avance le compteur plutot que de le perdre', () => {
        expect(pityApres({ depuisLegendaire: 1 }, undefined)).toEqual({ depuisLegendaire: 2 });
    });
});

describe('poolPourCeTirage', () => {
    it('hors garantie, le pool entier', () => {
        expect(poolPourCeTirage(POOL, PITY_INITIAL)).toHaveLength(POOL.length);
    });

    it('garantie due : seuls les legendaires', () => {
        const pool = poolPourCeTirage(POOL, { depuisLegendaire: SEUIL_PITY - 1 });
        expect(pool.map(i => i.id)).toEqual(['l1', 'l2']);
    });

    it('garantie due mais AUCUN legendaire tirable : le pack s ouvre quand meme', () => {
        // Une garantie qui ne peut rien donner ne doit pas bloquer l ouverture.
        const sansLegendaire = POOL.filter(i => i.rarity !== 'legendaire');
        const pool = poolPourCeTirage(sansLegendaire, { depuisLegendaire: SEUIL_PITY - 1 });
        expect(pool).toHaveLength(sansLegendaire.length);
    });

    it('ne modifie pas le pool d origine', () => {
        const copie = [...POOL];
        poolPourCeTirage(POOL, { depuisLegendaire: SEUIL_PITY - 1 });
        expect(POOL).toEqual(copie);
    });
});

describe('la garantie tient sur une serie', () => {
    it('jamais plus de SEUIL_PITY ouvertures sans legendaire', () => {
        // On simule un tirage systematiquement malchanceux : sans garantie, ce
        // joueur n aurait JAMAIS de legendaire.
        let etat = PITY_INITIAL;
        let ecartMax = 0;
        let depuis = 0;

        for (let pack = 0; pack < 50; pack++) {
            const pool = poolPourCeTirage(POOL, etat);
            // le pire tirage possible dans le pool propose
            const tire = pool.find(i => i.rarity !== 'legendaire') ?? pool[0];
            depuis++;
            if (tire.rarity === 'legendaire') {
                ecartMax = Math.max(ecartMax, depuis);
                depuis = 0;
            }
            etat = pityApres(etat, tire.rarity);
        }

        expect(ecartMax).toBeLessThanOrEqual(SEUIL_PITY);
        expect(ecartMax).toBeGreaterThan(0);
    });
});
