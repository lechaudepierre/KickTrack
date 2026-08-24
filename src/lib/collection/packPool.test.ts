import { describe, it, expect } from 'vitest';
import {
    readObtention,
    isPackEligible,
    buildPackPool,
    weightOf,
    drawFromPool,
    rarityOdds,
    seasonGradeAwards,
    seasonParticipationAwards,
    POIDS_PAR_RARETE,
    isDefaultItem,
    seasonAwardsFor,
} from './packPool';
import type { CatalogItem, Rarity, ItemObtention, ItemSource } from '@/types/collection';

const item = (
    id: string,
    rarity: Rarity,
    obtention?: ItemObtention,
    source: ItemSource = 'pack',
): CatalogItem => ({
    id, type: 'banner', rarity, source,
    asset: `/banners/${id}.webp`, tintable: false,
    ...(obtention ? { obtention } : {}),
    meta: { name: id },
});

describe('readObtention — le repli ne doit jamais ouvrir une porte', () => {
    it('un item catalogué avant le 21/08 avec source « createur » n\'est PAS tirable', () => {
        expect(readObtention(item('creator', 'legendaire', undefined, 'createur'))).toEqual({ pack: false });
    });

    it('idem pour une récompense de saison, un exploit, un event', () => {
        for (const src of ['saison', 'exploit', 'event', 'defaut'] as ItemSource[]) {
            expect(readObtention(item('x', 'rare', undefined, src)).pack).toBe(false);
        }
    });

    it('seule une provenance « pack » explicite rend un ancien item tirable', () => {
        expect(readObtention(item('x', 'rare', undefined, 'pack')).pack).toBe(true);
    });

    it('quand le champ est là, il fait foi — même contre la provenance', () => {
        const i = item('x', 'rare', { pack: false }, 'pack');
        expect(readObtention(i).pack).toBe(false);
    });
});

describe('buildPackPool — ce qu\'un pack peut donner', () => {
    const catalog = [
        item('a', 'commun', { pack: true }),
        item('b', 'rare', { pack: false }),
        item('c', 'legendaire', { pack: true }),
        item('creator', 'legendaire', undefined, 'createur'),
    ];

    it('ne garde que les items explicitement tirables', () => {
        expect(buildPackPool(catalog).map(i => i.id)).toEqual(['a', 'c']);
    });

    it('un item non tirable pèse zéro', () => {
        expect(weightOf(item('b', 'legendaire', { pack: false }))).toBe(0);
    });

    it('un item tirable pèse selon SA RARETÉ, pas selon lui-même', () => {
        expect(weightOf(item('a', 'commun', { pack: true }))).toBe(POIDS_PAR_RARETE.commun);
        expect(weightOf(item('c', 'legendaire', { pack: true }))).toBe(POIDS_PAR_RARETE.legendaire);
    });

    it('un légendaire est bien plus rare qu\'un commun', () => {
        expect(POIDS_PAR_RARETE.legendaire).toBeLessThan(POIDS_PAR_RARETE.commun);
    });
});

describe('drawFromPool — le tirage', () => {
    const pool = [
        item('commun1', 'commun', { pack: true }),      // poids 60
        item('rare1', 'rare', { pack: true }),          // poids 25
        item('legend1', 'legendaire', { pack: true }),  // poids 3
    ];
    // total 88

    it('un aléa de 0 tombe sur la première entrée', () => {
        expect(drawFromPool(pool, () => 0)?.id).toBe('commun1');
    });

    it('un aléa juste sous 1 tombe sur la dernière', () => {
        expect(drawFromPool(pool, () => 0.999999)?.id).toBe('legend1');
    });

    it('le curseur atterrit dans la bonne tranche', () => {
        // 59/88 = 0,670 -> encore dans le commun
        expect(drawFromPool(pool, () => 59 / 88)?.id).toBe('commun1');
        // 61/88 = 0,693 -> passé dans le rare
        expect(drawFromPool(pool, () => 61 / 88)?.id).toBe('rare1');
        // 86/88 -> dans le légendaire
        expect(drawFromPool(pool, () => 86 / 88)?.id).toBe('legend1');
    });

    it('un pool vide ne tire rien plutôt que de planter', () => {
        expect(drawFromPool([], () => 0.5)).toBeNull();
    });

    it('un pool sans aucun item tirable ne tire rien', () => {
        expect(drawFromPool([item('x', 'rare', { pack: false })], () => 0.5)).toBeNull();
    });

    it('le tirage est REPRODUCTIBLE : même aléa, même résultat', () => {
        const a = drawFromPool(pool, () => 0.42);
        const b = drawFromPool(pool, () => 0.42);
        expect(a?.id).toBe(b?.id);
    });

    it('sur beaucoup de tirages, le commun sort bien plus souvent que le légendaire', () => {
        let graine = 1;
        const pseudoAleatoire = () => {
            graine = (graine * 1103515245 + 12345) % 2147483648;
            return graine / 2147483648;
        };
        const comptes: Record<string, number> = {};
        for (let i = 0; i < 4000; i++) {
            const tire = drawFromPool(pool, pseudoAleatoire);
            if (tire) comptes[tire.id] = (comptes[tire.id] ?? 0) + 1;
        }
        expect(comptes.commun1).toBeGreaterThan(comptes.rare1);
        expect(comptes.rare1).toBeGreaterThan(comptes.legend1);
    });
});

describe('rarityOdds — les chances affichables', () => {
    it('un pool à une seule rareté donne 100 %', () => {
        const odds = rarityOdds([item('a', 'rare', { pack: true })]);
        expect(odds.rare).toBeCloseTo(100);
        expect(odds.commun).toBe(0);
    });

    it('la somme fait toujours 100 %', () => {
        const odds = rarityOdds([
            item('a', 'commun', { pack: true }),
            item('b', 'rare', { pack: true }),
            item('c', 'legendaire', { pack: true }),
        ]);
        const somme = Object.values(odds).reduce((a, b) => a + b, 0);
        expect(somme).toBeCloseTo(100);
    });

    it('deux communs pèsent plus qu\'un seul face au même rare', () => {
        const unSeul = rarityOdds([item('a', 'commun', { pack: true }), item('r', 'rare', { pack: true })]);
        const deux = rarityOdds([
            item('a', 'commun', { pack: true }),
            item('b', 'commun', { pack: true }),
            item('r', 'rare', { pack: true }),
        ]);
        expect(deux.commun).toBeGreaterThan(unSeul.commun);
    });

    it('un pool vide ne divise pas par zéro', () => {
        expect(rarityOdds([])).toEqual({ commun: 0, rare: 0, epique: 0, legendaire: 0 });
    });
});

describe('récompenses de saison', () => {
    const catalog = [
        item('s0-silver', 'commun', { pack: false, season: { id: 'season_0', grade: 'argent' } }, 'saison'),
        item('s0-gold', 'rare', { pack: false, season: { id: 'season_0', grade: 'or' } }, 'saison'),
        item('pionnier', 'rare', { pack: false, season: { id: 'season_0', participation: true } }, 'saison'),
        item('s1-gold', 'rare', { pack: false, season: { id: 'season_1', grade: 'or' } }, 'saison'),
        item('libre', 'commun', { pack: true }),
    ];

    it('la table grade -> item ne contient que la saison demandée', () => {
        const table = seasonGradeAwards(catalog, 'season_0');
        expect([...table.keys()].sort()).toEqual(['argent', 'or']);
        expect(table.get('or')?.id).toBe('s0-gold');
    });

    it('une bannière de participation n\'entre pas dans la table des grades', () => {
        expect(seasonGradeAwards(catalog, 'season_0').has('pionnier')).toBe(false);
    });

    it('les récompenses de participation sont listées à part', () => {
        expect(seasonParticipationAwards(catalog, 'season_0').map(i => i.id)).toEqual(['pionnier']);
    });

    it('une saison sans récompense ne renvoie rien plutôt que de planter', () => {
        expect(seasonGradeAwards(catalog, 'season_9').size).toBe(0);
        expect(seasonParticipationAwards(catalog, 'season_9')).toEqual([]);
    });

    it('aucune récompense de saison ne peut sortir d\'un pack', () => {
        for (const i of catalog.filter(i => readObtention(i).season)) {
            expect(isPackEligible(i)).toBe(false);
        }
    });
});

describe('isDefaultItem — possédé sans octroi', () => {
    it('un item de base est acquis d\'office', () => {
        expect(isDefaultItem(item('cercle', 'commun', undefined, 'defaut'))).toBe(true);
    });

    it('rien d\'autre ne l\'est', () => {
        for (const src of ['pack', 'saison', 'event', 'exploit', 'createur'] as ItemSource[]) {
            expect(isDefaultItem(item('x', 'commun', undefined, src))).toBe(false);
        }
    });

    it('un item de base ne sort JAMAIS d\'un pack', () => {
        // Un tirage qui donne ce que tout le monde a déjà n'a aucune valeur.
        const base = item('cercle', 'commun', undefined, 'defaut');
        expect(isPackEligible(base)).toBe(false);
        expect(buildPackPool([base])).toEqual([]);
    });
});

describe('seasonAwardsFor — les grades se cumulent vers le bas', () => {
    const grade = (id: string, g: 'argent' | 'or' | 'diamant' | 'master' | 'grandmaster') =>
        item(id, 'commun', { pack: false, season: { id: 'season_0', grade: g } }, 'saison');
    const catalog = [
        grade('argent', 'argent'),
        grade('or', 'or'),
        grade('diamant', 'diamant'),
        grade('master', 'master'),
        grade('gm', 'grandmaster'),
        item('pionnier', 'rare', { pack: false, season: { id: 'season_0', participation: true } }, 'saison'),
        item('champion', 'legendaire', { pack: false, season: { id: 'season_0', rankRange: [1, 1] } }, 'saison'),
        item('podium', 'epique', { pack: false, season: { id: 'season_0', rankRange: [2, 3] } }, 'saison'),
        item('libre', 'commun', { pack: true }),
    ];
    const ids = (o: Parameters<typeof seasonAwardsFor>[2]) =>
        seasonAwardsFor(catalog, 'season_0', o).map(i => i.id);

    it('finir Master donne Master ET tout ce qui est en dessous', () => {
        expect(ids({ grade: 'master', participated: true }))
            .toEqual(['argent', 'or', 'diamant', 'master', 'pionnier']);
    });

    it('mais JAMAIS ce qui est au-dessus', () => {
        expect(ids({ grade: 'master', participated: true })).not.toContain('gm');
    });

    it('finir Argent ne donne que le premier palier', () => {
        expect(ids({ grade: 'argent', participated: true })).toEqual(['argent', 'pionnier']);
    });

    it('finir Grand Master donne les cinq paliers', () => {
        expect(ids({ grade: 'grandmaster', participated: true }))
            .toEqual(['argent', 'or', 'diamant', 'master', 'gm', 'pionnier']);
    });

    it('progresser ne fait donc jamais PERDRE une récompense déjà due', () => {
        const avant = ids({ grade: 'or', participated: true });
        const apres = ids({ grade: 'diamant', participated: true });
        for (const id of avant) expect(apres).toContain(id);
    });

    it('le champion est le premier, et lui seul', () => {
        expect(ids({ grade: 'or', rank: 1, participated: true })).toContain('champion');
        expect(ids({ grade: 'or', rank: 2, participated: true })).not.toContain('champion');
    });

    it('le podium couvre la deuxième et la troisième place', () => {
        expect(ids({ grade: 'or', rank: 2, participated: true })).toContain('podium');
        expect(ids({ grade: 'or', rank: 3, participated: true })).toContain('podium');
        expect(ids({ grade: 'or', rank: 1, participated: true })).not.toContain('podium');
        expect(ids({ grade: 'or', rank: 4, participated: true })).not.toContain('podium');
    });

    it('une place peut se gagner sans le grade le plus haut', () => {
        // On peut finir premier sans être Grand Master : une place n'est pas
        // un palier d'ELO.
        const r = ids({ grade: 'argent', rank: 1, participated: true });
        expect(r).toContain('champion');
        expect(r).not.toContain('gm');
    });

    it('ne pas avoir joué ne donne rien du tout', () => {
        expect(ids({ grade: null, rank: null, participated: false })).toEqual([]);
    });

    it('avoir joué sans grade donne au moins la participation', () => {
        expect(ids({ grade: null, participated: true })).toEqual(['pionnier']);
    });

    it('un item hors saison n\'est jamais distribué', () => {
        expect(ids({ grade: 'grandmaster', rank: 1, participated: true })).not.toContain('libre');
    });

    it('une autre saison ne distribue rien', () => {
        expect(seasonAwardsFor(catalog, 'season_1', { grade: 'grandmaster', participated: true })).toEqual([]);
    });
});
