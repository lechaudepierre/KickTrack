/**
 * Tests de la logique pure d'octroi / révocation.
 *
 * Les fonctions qui touchent Firestore ne sont pas testées ici (ce serait
 * tester le SDK). On teste la logique qui DÉCIDE — c'est là que sont les bugs :
 * un identifiant d'octroi mal construit double une récompense, une révocation
 * mal décidée retire un item qui n'aurait jamais dû partir.
 */

import { describe, it, expect } from 'vitest';
import { buildGrantId } from './grant';
import { grantAddedACopy, readQuantity, afterRemovingOneCopy } from './quantity';

describe('buildGrantId — la clé de l\'idempotence', () => {
    it('est stable : deux appels identiques donnent le même identifiant', () => {
        const params = { userId: 'u1', itemId: 'grade_or_s0', source: 'saison' as const, sourceRef: 'season_0_close' };
        expect(buildGrantId(params)).toBe(buildGrantId(params));
    });

    it('ne dépend pas du joueur — l\'unicité est portée par le chemin du document', () => {
        const a = buildGrantId({ userId: 'u1', itemId: 'x', source: 'saison', sourceRef: 'r' });
        const b = buildGrantId({ userId: 'u2', itemId: 'x', source: 'saison', sourceRef: 'r' });
        expect(a).toBe(b);
    });

    it('distingue deux saisons différentes', () => {
        const s0 = buildGrantId({ userId: 'u', itemId: 'x', source: 'saison', sourceRef: 'season_0' });
        const s1 = buildGrantId({ userId: 'u', itemId: 'x', source: 'saison', sourceRef: 'season_1' });
        expect(s0).not.toBe(s1);
    });

    it('distingue deux items de la même opération', () => {
        const or = buildGrantId({ userId: 'u', itemId: 'grade_or_s0', source: 'saison', sourceRef: 'c' });
        const master = buildGrantId({ userId: 'u', itemId: 'grade_master_s0', source: 'saison', sourceRef: 'c' });
        expect(or).not.toBe(master);
    });

    it('sans sourceRef, l\'octroi est unique PAR SOURCE — voulu pour le prestige', () => {
        // On ne reçoit pas deux fois la bannière de créateur.
        const a = buildGrantId({ userId: 'u', itemId: 'creator', source: 'createur' });
        const b = buildGrantId({ userId: 'u', itemId: 'creator', source: 'createur' });
        expect(a).toBe(b);
        expect(a).toBe('createur:creator');
    });

    it('⚠️ deux ouvertures de pack DOIVENT porter un sourceRef distinct', () => {
        // Sans ça, la seconde ouverture serait vue comme un rejeu et ignorée.
        // Ce test documente le piège autant qu'il le vérifie.
        const sansRef1 = buildGrantId({ userId: 'u', itemId: 'x', source: 'pack' });
        const sansRef2 = buildGrantId({ userId: 'u', itemId: 'x', source: 'pack' });
        expect(sansRef1).toBe(sansRef2); // ← le piège

        const avecRef1 = buildGrantId({ userId: 'u', itemId: 'x', source: 'pack', sourceRef: 'pack_001' });
        const avecRef2 = buildGrantId({ userId: 'u', itemId: 'x', source: 'pack', sourceRef: 'pack_002' });
        expect(avecRef1).not.toBe(avecRef2); // ← la parade
    });
});

describe('readQuantity — combien d\'exemplaires', () => {
    it('un document créé avant le 21/08 n\'a pas le champ : il vaut UN exemplaire', () => {
        expect(readQuantity({})).toBe(1);
        expect(readQuantity(undefined)).toBe(1);
        expect(readQuantity(null)).toBe(1);
    });

    it('lit la valeur quand elle est là', () => {
        expect(readQuantity({ quantity: 3 })).toBe(3);
    });

    it('une valeur absurde ne fait jamais disparaître l\'item', () => {
        expect(readQuantity({ quantity: 0 })).toBe(1);
        expect(readQuantity({ quantity: -5 })).toBe(1);
    });
});

describe('grantAddedACopy — la révocation doit-elle dépiler ?', () => {
    it('depuis le 21/08, tout octroi ajoute un exemplaire', () => {
        expect(grantAddedACopy({ duplicate: false, addedCopy: true })).toBe(true);
        expect(grantAddedACopy({ duplicate: true, addedCopy: true })).toBe(true);
    });

    it('octroi ancien : un doublon n\'ajoutait rien, donc rien à dépiler', () => {
        expect(grantAddedACopy({ duplicate: true })).toBe(false);
    });

    it('octroi ancien non doublon : il avait bien donné l\'item', () => {
        expect(grantAddedACopy({ duplicate: false })).toBe(true);
    });
});

describe('afterRemovingOneCopy — dépiler sans jamais casser', () => {
    it('trois exemplaires : il en reste deux, le document survit', () => {
        expect(afterRemovingOneCopy(3)).toEqual({ quantity: 2, deleted: false });
    });

    it('le dernier exemplaire fait disparaître le document', () => {
        expect(afterRemovingOneCopy(1)).toEqual({ quantity: 0, deleted: true });
    });

    it('jamais de quantité négative, même sur une donnée incohérente', () => {
        expect(afterRemovingOneCopy(0)).toEqual({ quantity: 0, deleted: true });
        expect(afterRemovingOneCopy(-2)).toEqual({ quantity: 0, deleted: true });
    });

    it('dépiler n fois une pile de n la vide exactement', () => {
        let q = 4;
        for (let i = 0; i < 3; i++) {
            const r = afterRemovingOneCopy(q);
            expect(r.deleted).toBe(false);
            q = r.quantity;
        }
        expect(afterRemovingOneCopy(q)).toEqual({ quantity: 0, deleted: true });
    });
});
