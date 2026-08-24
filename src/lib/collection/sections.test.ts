import { describe, it, expect } from 'vitest';
import { buildSections, seasonOf } from './sections';
import type { CatalogItem, ItemObtention, Rarity, ItemType } from '@/types/collection';

const item = (
    id: string,
    o: { type?: ItemType; rarity?: Rarity; obtention?: ItemObtention; name?: string } = {},
): CatalogItem => ({
    id,
    type: o.type ?? 'banner',
    rarity: o.rarity ?? 'commun',
    source: 'pack',
    asset: `/banners/${id}.webp`,
    tintable: false,
    ...(o.obtention ? { obtention: o.obtention } : { obtention: { pack: true } }),
    meta: { name: o.name ?? id },
});

const saison = (id: string, grade?: 'argent' | 'or' | 'diamant' | 'master' | 'grandmaster', participation?: boolean) =>
    ({ pack: false, season: { id: 'season_0', ...(grade ? { grade } : {}), ...(participation ? { participation } : {}) } }) as ItemObtention;

describe('seasonOf', () => {
    it('reconnaît une récompense de saison', () => {
        expect(seasonOf(item('x', { obtention: saison('season_0', 'or') }))).toBe('season_0');
    });

    it('un item de pack n\'appartient à aucune saison', () => {
        expect(seasonOf(item('x'))).toBeNull();
    });
});

describe('buildSections', () => {
    const catalog = [
        item('dragon', { rarity: 'legendaire' }),
        item('lake', { rarity: 'rare' }),
        item('titre', { type: 'title', rarity: 'rare' }),
        item('s0-gm', { obtention: saison('season_0', 'grandmaster') }),
        item('s0-argent', { obtention: saison('season_0', 'argent') }),
        item('s0-pionnier', { obtention: saison('season_0', undefined, true) }),
    ];

    it('les récompenses de saison sortent des sections de type', () => {
        const bannieres = buildSections(catalog).find(s => s.key === 'banner');
        expect(bannieres?.items.map(i => i.id)).toEqual(['dragon', 'lake']);
    });

    it('elles forment leur propre section', () => {
        const s0 = buildSections(catalog).find(s => s.key === 'season:season_0');
        expect(s0).toBeDefined();
        expect(s0?.items).toHaveLength(3);
    });

    it('la section de saison passe APRÈS tous les types', () => {
        const cles = buildSections(catalog).map(s => s.key);
        expect(cles.indexOf('season:season_0')).toBe(cles.length - 1);
        expect(cles.indexOf('banner')).toBeLessThan(cles.indexOf('season:season_0'));
    });

    it('la rareté n\'est pas affichée dans une section de saison', () => {
        const sections = buildSections(catalog);
        expect(sections.find(s => s.key === 'season:season_0')?.showRarity).toBe(false);
        expect(sections.find(s => s.key === 'banner')?.showRarity).toBe(true);
    });

    it('dans une saison, l\'ordre suit la PROGRESSION, pas la rareté', () => {
        const s0 = buildSections(catalog).find(s => s.key === 'season:season_0');
        expect(s0?.items.map(i => i.id)).toEqual(['s0-pionnier', 's0-argent', 's0-gm']);
    });

    it('les types gardent leur tri par rareté décroissante', () => {
        const bannieres = buildSections(catalog).find(s => s.key === 'banner');
        expect(bannieres?.items[0].id).toBe('dragon');
    });

    it('une section vide n\'est jamais renvoyée', () => {
        const cles = buildSections([item('seul')]).map(s => s.key);
        expect(cles).toEqual(['banner']);
    });

    it('un catalogue vide ne produit aucune section', () => {
        expect(buildSections([])).toEqual([]);
    });

    it('plusieurs saisons : la plus récente en premier', () => {
        const multi = [
            item('a', { obtention: { pack: false, season: { id: 'season_0', grade: 'or' } } }),
            item('b', { obtention: { pack: false, season: { id: 'season_1', grade: 'or' } } }),
        ];
        const cles = buildSections(multi).map(s => s.key);
        expect(cles).toEqual(['season:season_1', 'season:season_0']);
    });

    it('le libellé d\'une saison est lisible', () => {
        const s0 = buildSections(catalog).find(s => s.key === 'season:season_0');
        expect(s0?.label).toBe('Saison 0');
    });
});
