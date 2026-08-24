import { describe, it, expect } from 'vitest';
import {
    itemsFor,
    buildClosurePlan,
    allConfiguredItems,
    validateConfig,
    summarize,
    ORDRE_GRADES,
    type SeasonCloseConfig,
    type FinalStanding,
    packsFor,
} from './seasonClosure';
import type { RankType } from '@/lib/utils/rankUtils';

const config: SeasonCloseConfig = {
    from: { id: 'season_0', label: 'Saison 0' },
    to: { id: 'season_1', label: 'Saison 1' },
    elo: { mode: 'compress', k: 0.5 },
    placementGames: 3,
    recompenses: {
        participation: ['pionnier_s0'],
        parGrade: {
            argent: ['b_argent', 't_argent'],
            or: ['b_or', 't_or'],
            diamant: ['b_diamant', 't_diamant'],
            master: ['b_master', 't_master'],
            grandmaster: ['b_gm', 't_gm'],
        },
        grades_cumulatifs: true,
        parPlace: [
            { min: 1, max: 1, items: ['champion_s0'] },
            { min: 2, max: 3, items: ['podium_s0'] },
        ],
    },
};

const joueur = (o: Partial<FinalStanding> = {}): FinalStanding => ({
    userId: 'u', username: 'Joueur', rank: 10, elo: 1100,
    peakGrade: 'or', games: 25, ...o,
});

describe('itemsFor — le cumul des grades', () => {
    it('un joueur Master reçoit AUSSI Argent, Or et Diamant', () => {
        // Décision de Sacha : « les items des rangs en dessous, je les débloque aussi ».
        const items = itemsFor(joueur({ peakGrade: 'master' }), config);
        expect(items).toContain('b_argent');
        expect(items).toContain('b_or');
        expect(items).toContain('b_diamant');
        expect(items).toContain('b_master');
    });

    it('mais PAS ceux du dessus', () => {
        expect(itemsFor(joueur({ peakGrade: 'master' }), config)).not.toContain('b_gm');
    });

    it('un Argent ne reçoit que le sien', () => {
        const items = itemsFor(joueur({ peakGrade: 'argent' }), config);
        expect(items.filter(i => i.startsWith('b_'))).toEqual(['b_argent']);
    });

    it('un Grand Master reçoit les cinq grades', () => {
        const items = itemsFor(joueur({ peakGrade: 'grandmaster' }), config);
        expect(items.filter(i => i.startsWith('b_'))).toHaveLength(5);
    });

    it('sans cumul, il ne reçoit que son grade', () => {
        const sansCumul = { ...config, recompenses: { ...config.recompenses, grades_cumulatifs: false } };
        expect(itemsFor(joueur({ peakGrade: 'master' }), sansCumul).filter(i => i.startsWith('b_')))
            .toEqual(['b_master']);
    });
});

describe('itemsFor — la participation', () => {
    it('est donnée dès une partie jouée', () => {
        expect(itemsFor(joueur({ games: 1 }), config)).toContain('pionnier_s0');
    });

    it('n\'est PAS donnée à qui n\'a jamais joué', () => {
        expect(itemsFor(joueur({ games: 0 }), config)).not.toContain('pionnier_s0');
    });
});

describe('itemsFor — la place finale', () => {
    it('le premier reçoit Champion', () => {
        expect(itemsFor(joueur({ rank: 1 }), config)).toContain('champion_s0');
    });

    it('les deuxième et troisième reçoivent Podium', () => {
        expect(itemsFor(joueur({ rank: 2 }), config)).toContain('podium_s0');
        expect(itemsFor(joueur({ rank: 3 }), config)).toContain('podium_s0');
    });

    it('le premier ne reçoit PAS Podium — les tranches ne se chevauchent pas', () => {
        expect(itemsFor(joueur({ rank: 1 }), config)).not.toContain('podium_s0');
    });

    it('le quatrième ne reçoit rien de particulier', () => {
        const items = itemsFor(joueur({ rank: 4 }), config);
        expect(items).not.toContain('champion_s0');
        expect(items).not.toContain('podium_s0');
    });
});

describe('itemsFor — pas de doublon', () => {
    it('un item cité deux fois n\'est octroyé qu\'une', () => {
        const doublon: SeasonCloseConfig = {
            ...config,
            recompenses: {
                ...config.recompenses,
                participation: ['b_or'],
                parPlace: [{ min: 1, max: 1, items: ['b_or'] }],
            },
        };
        expect(itemsFor(joueur({ rank: 1, peakGrade: 'or' }), doublon).filter(i => i === 'b_or'))
            .toHaveLength(1);
    });

    it('la liste est triée, donc comparable d\'une exécution à l\'autre', () => {
        const items = itemsFor(joueur({ peakGrade: 'grandmaster', rank: 1 }), config);
        expect([...items].sort()).toEqual(items);
    });
});

describe('buildClosurePlan', () => {
    const standings: FinalStanding[] = [
        joueur({ userId: 'c', username: 'Troisième', rank: 3, elo: 1150, peakGrade: 'diamant' }),
        joueur({ userId: 'a', username: 'Premier', rank: 1, elo: 1350, peakGrade: 'grandmaster' }),
        joueur({ userId: 'b', username: 'Deuxième', rank: 2, elo: 1250, peakGrade: 'master' }),
    ];

    it('trie par place finale', () => {
        expect(buildClosurePlan(standings, config).map(p => p.username))
            .toEqual(['Premier', 'Deuxième', 'Troisième']);
    });

    it('calcule le nouvel ELO de chacun', () => {
        const plan = buildClosurePlan(standings, config);
        expect(plan[0].eloBefore).toBe(1350);
        expect(plan[0].eloAfter).toBe(1175);
    });

    it('l\'ordre du classement survit à la compression', () => {
        const plan = buildClosurePlan(standings, config);
        expect(plan[0].eloAfter).toBeGreaterThan(plan[1].eloAfter);
        expect(plan[1].eloAfter).toBeGreaterThan(plan[2].eloAfter);
    });

    it('ne modifie jamais la liste reçue', () => {
        buildClosurePlan(standings, config);
        expect(standings[0].username).toBe('Troisième');
    });
});

describe('validateConfig — refuser de démarrer plutôt que s\'arrêter au milieu', () => {
    const catalogue = [
        'pionnier_s0', 'champion_s0', 'podium_s0',
        'b_argent', 'b_or', 'b_diamant', 'b_master', 'b_gm',
        't_argent', 't_or', 't_diamant', 't_master', 't_gm',
    ];

    it('accepte une configuration complète', () => {
        expect(validateConfig(config, catalogue)).toEqual([]);
    });

    it('refuse un item absent du catalogue', () => {
        const erreurs = validateConfig(config, catalogue.filter(i => i !== 'b_master'));
        expect(erreurs).toHaveLength(1);
        expect(erreurs[0]).toContain('b_master');
    });

    it('refuse deux saisons de même identifiant', () => {
        const bancal = { ...config, to: { id: 'season_0', label: 'X' } };
        expect(validateConfig(bancal, catalogue).some(e => e.includes('même identifiant'))).toBe(true);
    });

    it('refuse une tranche de places à l\'envers', () => {
        const bancal: SeasonCloseConfig = {
            ...config,
            recompenses: { ...config.recompenses, parPlace: [{ min: 5, max: 2, items: [] }] },
        };
        expect(validateConfig(bancal, catalogue).some(e => e.includes('incohérente'))).toBe(true);
    });

    it('refuse une place qui commence à zéro', () => {
        const bancal: SeasonCloseConfig = {
            ...config,
            recompenses: { ...config.recompenses, parPlace: [{ min: 0, max: 3, items: [] }] },
        };
        expect(validateConfig(bancal, catalogue).some(e => e.includes('commence à 1'))).toBe(true);
    });

    it('signale TOUTES les erreurs d\'un coup, pas la première', () => {
        const erreurs = validateConfig(config, []);
        expect(erreurs.length).toBeGreaterThan(5);
    });
});

describe('allConfiguredItems', () => {
    it('rassemble les items de toutes les sources, sans doublon', () => {
        const tous = allConfiguredItems(config);
        expect(tous).toContain('pionnier_s0');
        expect(tous).toContain('b_gm');
        expect(tous).toContain('champion_s0');
        expect(new Set(tous).size).toBe(tous.length);
    });
});

describe('summarize — le contrôle à blanc', () => {
    it('compte les joueurs et les octrois', () => {
        const plan = buildClosurePlan([
            joueur({ userId: 'a', rank: 1, peakGrade: 'grandmaster' }),
            joueur({ userId: 'b', rank: 2, peakGrade: 'argent' }),
        ], config);
        const r = summarize(plan);
        expect(r.joueurs).toBe(2);
        expect(r.octrois).toBe(plan[0].items.length + plan[1].items.length);
    });

    it('repère les joueurs qui ne reçoivent rien', () => {
        const plan = buildClosurePlan([joueur({ games: 0, rank: 99, peakGrade: 'argent' })], config);
        expect(summarize(plan).sansRecompense).toBe(0);
    });

    it('classe les items du plus distribué au moins distribué', () => {
        const plan = buildClosurePlan([
            joueur({ userId: 'a', rank: 1, peakGrade: 'grandmaster' }),
            joueur({ userId: 'b', rank: 2, peakGrade: 'argent' }),
            joueur({ userId: 'c', rank: 3, peakGrade: 'argent' }),
        ], config);
        const r = summarize(plan);
        expect(r.parItem[0][1]).toBeGreaterThanOrEqual(r.parItem[r.parItem.length - 1][1]);
    });
});

describe('l\'ordre des grades', () => {
    it('va du plus accessible au plus élevé', () => {
        expect(ORDRE_GRADES).toEqual(['argent', 'or', 'diamant', 'master', 'grandmaster']);
    });
});

describe('packsFor — les packs d\'ouverture de saison', () => {
    const base: SeasonCloseConfig = {
        from: { id: 's0', label: 'Saison 0' },
        to: { id: 's1', label: 'Saison 1' },
        elo: { mode: 'compress', k: 0.5 },
        placementGames: 3,
        recompenses: { participation: [], parGrade: {}, grades_cumulatifs: true, parPlace: [] },
        packsDOuverture: { tous: 1, parGrade: { master: 2, grandmaster: 3 } },
    };
    const joueur = (peakGrade: RankType): FinalStanding =>
        ({ userId: 'u', username: 'u', rank: 1, elo: 1000, peakGrade, games: 10 });

    it('sans configuration, personne ne reçoit rien', () => {
        const sansPacks = { ...base, packsDOuverture: undefined };
        expect(packsFor(joueur('grandmaster'), sansPacks)).toBe(0);
    });

    it('le socle vaut pour les grades non listés', () => {
        for (const g of ['argent', 'or', 'diamant'] as RankType[]) {
            expect(packsFor(joueur(g), base)).toBe(1);
        }
    });

    it('un Master reçoit son palier', () => {
        expect(packsFor(joueur('master'), base)).toBe(2);
    });

    it('un Grand Master reçoit le sien', () => {
        expect(packsFor(joueur('grandmaster'), base)).toBe(3);
    });

    it('ce n\'est PAS cumulatif : le plus haut palier l\'emporte', () => {
        // Un Grand Master reçoit 3, pas 1 + 2 + 3.
        expect(packsFor(joueur('grandmaster'), base)).toBe(3);
    });

    it('un palier plus bas que le socle ne fait jamais perdre de packs', () => {
        const bizarre = { ...base, packsDOuverture: { tous: 5, parGrade: { master: 2 } } };
        expect(packsFor(joueur('master'), bizarre)).toBe(5);
    });

    it('un socle absent vaut zéro pour les grades non listés', () => {
        const sansSocle = { ...base, packsDOuverture: { parGrade: { grandmaster: 3 } } };
        expect(packsFor(joueur('or'), sansSocle)).toBe(0);
        expect(packsFor(joueur('grandmaster'), sansSocle)).toBe(3);
    });

    it('l\'ordre d\'écriture dans la config n\'a aucune importance', () => {
        const inverse = { ...base, packsDOuverture: { tous: 1, parGrade: { grandmaster: 3, master: 2 } } };
        expect(packsFor(joueur('grandmaster'), inverse)).toBe(3);
        expect(packsFor(joueur('master'), inverse)).toBe(2);
    });
});
