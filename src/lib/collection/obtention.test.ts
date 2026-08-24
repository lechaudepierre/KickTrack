import { describe, it, expect } from 'vitest';
import { describeObtention, needsWrittenExplanation, formatSeason } from './obtention';
import type { CatalogItem, ItemSource } from '@/types/collection';

const item = (o: Partial<CatalogItem> & { meta?: Partial<CatalogItem['meta']> } = {}): CatalogItem => ({
    id: 'x',
    type: 'banner',
    rarity: 'commun',
    source: 'pack',
    asset: '/banners/x.png',
    tintable: false,
    ...o,
    meta: { name: 'X', ...(o.meta ?? {}) },
});

describe('describeObtention', () => {
    it('préfère toujours la description du catalogue', () => {
        const r = describeObtention(item({ source: 'exploit', meta: { name: 'X', description: 'Gagne 10 matchs d\'affilée.' } }));
        expect(r).toEqual({ text: 'Gagne 10 matchs d\'affilée.', authored: true, fromPack: false });
    });

    it('ignore une description vide ou blanche', () => {
        expect(describeObtention(item({ meta: { name: 'X', description: '   ' } })).authored).toBe(false);
    });

    it('déduit la phrase de la provenance à défaut', () => {
        expect(describeObtention(item({ source: 'createur' })).text).toContain('fondateurs');
        expect(describeObtention(item({ source: 'pack' })).text).toContain('packs');
        expect(describeObtention(item({ source: 'defaut' })).text).toContain('dès le départ');
    });

    it('une récompense de saison sans description dit au moins laquelle', () => {
        const r = describeObtention(item({ source: 'saison', meta: { name: 'X', season: 'season_1' } }));
        expect(r.text).toBe('Récompense de fin de saison 1.');
        expect(r.authored).toBe(false);
    });

    it('récompense de saison sans saison renseignée : phrase générique', () => {
        expect(describeObtention(item({ source: 'saison' })).text).toBe('Récompense de fin de saison.');
    });

    it('toute provenance produit une phrase non vide', () => {
        const sources: ItemSource[] = ['pack', 'saison', 'event', 'exploit', 'createur', 'defaut'];
        for (const source of sources) {
            expect(describeObtention(item({ source })).text.length).toBeGreaterThan(0);
        }
    });
});

describe('describeObtention — la règle d\'attribution bat la prose', () => {
    it('une bannière de grade dit exactement qui la reçoit', () => {
        const r = describeObtention(item({
            source: 'saison',
            obtention: { pack: false, season: { id: 'season_0', grade: 'or' } },
            meta: { name: 'X', description: 'Une jolie bannière dorée.' },
        }));
        expect(r.text).toBe('Attribuée à la clôture de la saison 0 à tout joueur dont le meilleur grade est Or.');
        expect(r.authored).toBe(true);
        expect(r.fromPack).toBe(false);
    });

    it('une bannière de participation aussi', () => {
        const r = describeObtention(item({
            source: 'saison',
            obtention: { pack: false, season: { id: 'season_0', participation: true } },
        }));
        expect(r.text).toBe('Attribuée à tout joueur ayant joué pendant la saison 0.');
    });

    it('un item tirable le dit, et le signale à part', () => {
        const r = describeObtention(item({ source: 'saison', obtention: { pack: true } }));
        expect(r.fromPack).toBe(true);
        expect(r.text).toContain('packs');
    });

    it('un item de prestige n\'est jamais annoncé comme tirable', () => {
        const r = describeObtention(item({ source: 'createur' }));
        expect(r.fromPack).toBe(false);
    });
});

describe('needsWrittenExplanation', () => {
    it('un exploit sans description est inexploitable pour le joueur', () => {
        expect(needsWrittenExplanation(item({ source: 'exploit' }))).toBe(true);
    });

    it('un event sans description aussi', () => {
        expect(needsWrittenExplanation(item({ source: 'event' }))).toBe(true);
    });

    it('un item de pack se passe très bien de la phrase générique', () => {
        expect(needsWrittenExplanation(item({ source: 'pack' }))).toBe(false);
    });

    it('une description écrite suffit, quelle que soit la provenance', () => {
        expect(needsWrittenExplanation(item({ source: 'exploit', meta: { name: 'X', description: 'Fais 6-0.' } }))).toBe(false);
    });
});

describe('formatSeason', () => {
    it('traduit le format de stockage', () => {
        expect(formatSeason('season_1')).toBe('saison 1');
        expect(formatSeason('season_0')).toBe('saison 0');
    });

    it('laisse passer un format inattendu plutôt que de mentir', () => {
        expect(formatSeason('hiver2026')).toBe('hiver2026');
    });

    it('rien à formater', () => {
        expect(formatSeason(undefined)).toBeNull();
    });
});

describe('describeObtention — les récompenses de PLACE', () => {
    const place = (min: number, max: number) => describeObtention(item({
        source: 'saison',
        obtention: { pack: false, season: { id: 'season_0', rankRange: [min, max] } },
        meta: { name: 'X', description: 'une description qui pourrait mentir' },
    })).text;

    it('la première place se dit « premier »', () => {
        expect(place(1, 1)).toBe('Attribué à la clôture de la saison 0 au joueur arrivé premier au classement général.');
    });

    it('un intervalle se dit au pluriel', () => {
        expect(place(2, 3)).toBe('Attribué à la clôture de la saison 0 aux joueurs arrivés entre la 2e et la 3e place au classement général.');
    });

    it('la règle bat toujours la description écrite', () => {
        // Une phrase recopiée à la main finit par ne plus correspondre à la
        // règle. Ici elle ne peut pas diverger.
        expect(place(1, 1)).not.toContain('mentir');
    });

    it('une place n\'est jamais tirable en pack', () => {
        const r = describeObtention(item({
            source: 'saison',
            obtention: { pack: false, season: { id: 'season_0', rankRange: [1, 1] } },
        }));
        expect(r.fromPack).toBe(false);
    });
});
