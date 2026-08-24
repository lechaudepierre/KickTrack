import { describe, it, expect } from 'vitest';
import {
    computePackEarning,
    packInstanceId,
    packIdsToCreate,
    PARTIES_PAR_PACK,
    gameCountsForPacks,
    BUTS_MINIMUM_GAGNANT,
} from './packEarning';

const avecRetro = { retroactif: true };
const des = (granted: number, baseline = 0) => ({ granted, baseline });

describe('computePackEarning — la dérivation', () => {
    it('juste avant le premier palier : rien encore', () => {
        expect(computePackEarning(PARTIES_PAR_PACK - 1, des(0), avecRetro)).toMatchObject({ due: 0, toGrant: 0, newPacksGranted: 0 });
    });

    it('la partie du premier palier donne le premier pack', () => {
        expect(computePackEarning(PARTIES_PAR_PACK, des(0), avecRetro)).toMatchObject({ due: 1, toGrant: 1, newPacksGranted: 1 });
    });

    it('entre deux paliers, rien ne tombe', () => {
        for (let ecart = 1; ecart < PARTIES_PAR_PACK; ecart++) {
            expect(computePackEarning(PARTIES_PAR_PACK + ecart, des(1), avecRetro).toGrant).toBe(0);
        }
    });

    it('le palier suivant redonne exactement un pack', () => {
        expect(computePackEarning(PARTIES_PAR_PACK * 2, des(1), avecRetro).toGrant).toBe(1);
    });

    it('un rattrapage donne tout ce qui manque d\'un coup', () => {
        // Le compteur avait pris du retard : 5 dus, 2 donnés.
        expect(computePackEarning(PARTIES_PAR_PACK * 5, des(2), avecRetro)).toMatchObject({ due: 5, toGrant: 3, newPacksGranted: 5 });
    });

    it('rejouer la même partie n\'octroie rien de plus', () => {
        const premier = computePackEarning(PARTIES_PAR_PACK, des(0), avecRetro);
        const second = computePackEarning(PARTIES_PAR_PACK, des(premier.newPacksGranted), avecRetro);
        expect(second.toGrant).toBe(0);
    });

    it('on ne reprend JAMAIS un pack déjà donné, même si des parties disparaissent', () => {
        const r = computePackEarning(PARTIES_PAR_PACK, des(5), avecRetro);
        expect(r.toGrant).toBe(0);
        expect(r.newPacksGranted).toBe(5);
    });

    it('un compteur négatif ou absurde ne casse rien', () => {
        expect(computePackEarning(-5, des(0), avecRetro).due).toBe(0);
        expect(computePackEarning(PARTIES_PAR_PACK * 3, des(-3), avecRetro).toGrant).toBe(3);
    });
});

describe('computePackEarning — le premier passage sur un compte existant', () => {
    it('sans rétroactif : le repère est posé, rien n\'est donné', () => {
        // Un joueur à 255 parties ne reçoit pas 25 packs au retour d'une mise à jour.
        expect(computePackEarning(255, {}, { retroactif: false }))
            .toEqual({ due: 0, toGrant: 0, newPacksGranted: 0, baseline: 255 });
    });

    it('sans rétroactif : il gagne son pack au palier SUIVANT, pas avant', () => {
        const DEPART = 255;
        const repere = computePackEarning(DEPART, {}, { retroactif: false });
        const etat = { granted: repere.newPacksGranted, baseline: repere.baseline };
        // Une partie avant le palier : toujours rien.
        expect(computePackEarning(DEPART + PARTIES_PAR_PACK - 1, etat, { retroactif: false }).toGrant).toBe(0);
        // Le palier pile : le pack tombe.
        expect(computePackEarning(DEPART + PARTIES_PAR_PACK, etat, { retroactif: false }).toGrant).toBe(1);
    });

    it('deux joueurs très inégaux attendent exactement autant l\'un que l\'autre', () => {
        const gros = computePackEarning(259, {}, { retroactif: false });
        const petit = computePackEarning(3, {}, { retroactif: false });
        const apres = (dep: number, r: typeof gros) =>
            computePackEarning(dep + PARTIES_PAR_PACK, { granted: r.newPacksGranted, baseline: r.baseline }, { retroactif: false }).toGrant;
        expect(apres(259, gros)).toBe(1);
        expect(apres(3, petit)).toBe(1);
    });

    it('le repère ne bouge plus une fois posé', () => {
        const etat = { granted: 0, baseline: 100 };
        expect(computePackEarning(150, etat, { retroactif: false }).baseline).toBe(100);
    });

    it('avec rétroactif : tout l\'historique compte', () => {
        const parties = PARTIES_PAR_PACK * 25;
        expect(computePackEarning(parties, {}, avecRetro).toGrant).toBe(25);
    });

    it('un nouveau compte n\'est pas concerné : zéro dans les deux cas', () => {
        expect(computePackEarning(0, {}, { retroactif: false }).newPacksGranted).toBe(0);
        expect(computePackEarning(0, {}, avecRetro).toGrant).toBe(0);
    });
});

describe('identifiants de pack', () => {
    it('sont déterministes', () => {
        expect(packInstanceId(7)).toBe('pack_7');
    });

    it('couvrent exactement la tranche octroyée', () => {
        expect(packIdsToCreate({ due: 5, toGrant: 3, newPacksGranted: 5, baseline: 0 }))
            .toEqual(['pack_3', 'pack_4', 'pack_5']);
    });

    it('rien à créer quand rien n\'est dû', () => {
        expect(packIdsToCreate({ due: 2, toGrant: 0, newPacksGranted: 2, baseline: 0 })).toEqual([]);
    });

    it('le tout premier pack porte le numéro 1', () => {
        const r = computePackEarning(PARTIES_PAR_PACK, des(0), avecRetro);
        expect(packIdsToCreate(r)).toEqual(['pack_1']);
    });

    it('deux octrois successifs ne se chevauchent jamais', () => {
        const a = computePackEarning(20, des(0), avecRetro);
        const b = computePackEarning(40, des(a.newPacksGranted), avecRetro);
        const chevauchement = packIdsToCreate(a).filter(id => packIdsToCreate(b).includes(id));
        expect(chevauchement).toEqual([]);
    });
});

describe('le réglage', () => {
    it('la cadence est une valeur de reglage, pas une regle', () => {
        // On ne fige PAS le nombre : c'est un PROVISOIRE que Sacha ajuste --
        // 10 au depart, 5 depuis le 24/08. Ce qui doit rester vrai, c'est
        // qu'il soit utilisable comme palier.
        expect(PARTIES_PAR_PACK).toBeGreaterThan(0);
        expect(Number.isInteger(PARTIES_PAR_PACK)).toBe(true);
    });
});

describe('gameCountsForPacks — protection contre le farm', () => {
    it('une partie complète entre comptes réels compte', () => {
        expect(gameCountsForPacks({ winnerScore: 6, hasGuests: false })).toBe(true);
        expect(gameCountsForPacks({ winnerScore: 10, hasGuests: false })).toBe(true);
    });

    it('une partie écourtée ne compte pas', () => {
        expect(gameCountsForPacks({ winnerScore: 5, hasGuests: false })).toBe(false);
        expect(gameCountsForPacks({ winnerScore: 1, hasGuests: false })).toBe(false);
        expect(gameCountsForPacks({ winnerScore: 0, hasGuests: false })).toBe(false);
    });

    it('la présence d\'un invité disqualifie, même sur une partie complète', () => {
        // Un invité n'a pas de compte : la partie se fabrique en trois clics.
        expect(gameCountsForPacks({ winnerScore: 10, hasGuests: true })).toBe(false);
    });

    it('le seuil est exactement atteignable, pas à dépasser', () => {
        expect(gameCountsForPacks({ winnerScore: BUTS_MINIMUM_GAGNANT, hasGuests: false })).toBe(true);
        expect(gameCountsForPacks({ winnerScore: BUTS_MINIMUM_GAGNANT - 1, hasGuests: false })).toBe(false);
    });

    it('le seuil est réglable sans toucher au code appelant', () => {
        expect(gameCountsForPacks({ winnerScore: 3, hasGuests: false }, 3)).toBe(true);
        expect(gameCountsForPacks({ winnerScore: 3, hasGuests: false }, 8)).toBe(false);
    });

    it('le seuil par défaut est bien six buts', () => {
        expect(BUTS_MINIMUM_GAGNANT).toBe(6);
    });
});

describe('les modes au chronomètre — décision du 23/08', () => {
    it('un blitz qui finit 3-2 rapporte quand même un pack', () => {
        // Le seuil de six buts n'a aucun sens ici : une partie au chrono se
        // termine souvent bien en dessous.
        expect(gameCountsForPacks({ winnerScore: 3, hasGuests: false, timed: true })).toBe(true);
    });

    it('même un 1-0 au chrono compte : c\'est la DURÉE qui protège du farm', () => {
        expect(gameCountsForPacks({ winnerScore: 1, hasGuests: false, timed: true })).toBe(true);
    });

    it('mais les invités disqualifient toujours, chrono ou pas', () => {
        expect(gameCountsForPacks({ winnerScore: 10, hasGuests: true, timed: true })).toBe(false);
    });

    it('sans chronomètre, le seuil de six buts s\'applique toujours', () => {
        expect(gameCountsForPacks({ winnerScore: 3, hasGuests: false, timed: false })).toBe(false);
        expect(gameCountsForPacks({ winnerScore: 6, hasGuests: false })).toBe(true);
    });
});
