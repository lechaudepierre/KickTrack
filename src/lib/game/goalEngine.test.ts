import { describe, expect, it } from 'vitest';
import type { Goal } from '@/types/game';
import {
    ETAT_INITIAL,
    appliquerBut,
    effetDuBut,
    etatEstCoherent,
    rejouerButs,
    sansLeDernierBut,
    type ButJoue,
    type EtatDeJeu,
} from './goalEngine';

const but = (p: Partial<ButJoue> = {}): ButJoue => ({
    type: 'normal',
    teamIndex: 0,
    ...p,
});

describe('effetDuBut', () => {
    it('un but normal encaisse le multiplicateur courant', () => {
        expect(effetDuBut({ scores: [0, 0], multiplier: 3 }, but())).toEqual({
            points: 3,
            variationAdverse: 0,
            multiplierSuivant: 1,
        });
    });

    it('un but flash compte comme un but normal', () => {
        expect(effetDuBut({ scores: [0, 0], multiplier: 2 }, but({ type: 'flash' })).points).toBe(2);
    });

    it('un tir depuis le milieu ne marque pas et arme le but suivant', () => {
        expect(effetDuBut(ETAT_INITIAL, but({ position: 'midfield' }))).toEqual({
            points: 0,
            variationAdverse: 0,
            multiplierSuivant: 2,
        });
    });

    it('le milieu prime sur le type du but', () => {
        const effet = effetDuBut({ scores: [0, 0], multiplier: 2 }, but({ type: 'gamelle', position: 'midfield' }));
        expect(effet).toEqual({ points: 0, variationAdverse: 0, multiplierSuivant: 3 });
    });

    it('une gamelle ne rapporte rien et retire un point a l adversaire', () => {
        expect(effetDuBut({ scores: [4, 4], multiplier: 1 }, but({ type: 'gamelle' }))).toEqual({
            points: 0,
            variationAdverse: -1,
            multiplierSuivant: 1,
        });
    });

    it('une gamelle rentrante rapporte un point et en retire un', () => {
        expect(effetDuBut({ scores: [4, 4], multiplier: 1 }, but({ type: 'gamelle_rentrante' }))).toEqual({
            points: 1,
            variationAdverse: -1,
            multiplierSuivant: 1,
        });
    });

    it('une gamelle ne consomme pas le multiplicateur arme', () => {
        expect(effetDuBut({ scores: [0, 0], multiplier: 3 }, but({ type: 'gamelle' })).multiplierSuivant).toBe(3);
    });

    it('un but contre son camp donne le point a l adversaire, pas au tireur', () => {
        expect(effetDuBut({ scores: [0, 0], multiplier: 2 }, but({ type: 'ownGoal' }))).toEqual({
            points: 0,
            variationAdverse: 1,
            multiplierSuivant: 2,
        });
    });

    it('un type inconnu vaut un point simple, sans toucher au multiplicateur', () => {
        // Dix-neuf buts de production portent `type: 'attack'` (une version
        // ancienne y ecrivait la position). Ils valaient un point a l epoque :
        // le rejeu doit leur rendre ce point.
        const ancien = { type: 'attack', position: 'attack', teamIndex: 0 } as unknown as ButJoue;
        expect(effetDuBut({ scores: [2, 1], multiplier: 2 }, ancien)).toEqual({
            points: 1,
            variationAdverse: 0,
            multiplierSuivant: 2,
        });
    });

    it('un type inconnu tire du milieu reste un tir de milieu', () => {
        const ancien = { type: 'attack', position: 'midfield', teamIndex: 0 } as unknown as ButJoue;
        expect(effetDuBut({ scores: [0, 0], multiplier: 1 }, ancien).points).toBe(0);
    });

    it('un multiplicateur absent vaut 1', () => {
        const etat = { scores: [0, 0], multiplier: undefined } as unknown as EtatDeJeu;
        expect(effetDuBut(etat, but()).points).toBe(1);
    });
});

describe('appliquerBut', () => {
    it('cree un nouvel etat sans modifier le precedent', () => {
        const avant: EtatDeJeu = { scores: [1, 1], multiplier: 1 };
        appliquerBut(avant, but());
        expect(avant).toEqual({ scores: [1, 1], multiplier: 1 });
    });

    it('porte les points a l equipe qui a tire', () => {
        expect(appliquerBut({ scores: [0, 0], multiplier: 2 }, but({ teamIndex: 1 }))).toEqual({
            scores: [0, 2],
            multiplier: 1,
        });
    });

    it('une gamelle sur un score nul met bien l adversaire a -1', () => {
        // C est la regle du jeu, pas un accident : neuf parties de production
        // portent un score negatif et c est justifie.
        expect(appliquerBut(ETAT_INITIAL, but({ type: 'gamelle' }))).toEqual({
            scores: [0, -1],
            multiplier: 1,
        });
    });

    it('deux gamelles d affilee descendent a -2', () => {
        const apres = appliquerBut(
            appliquerBut(ETAT_INITIAL, but({ type: 'gamelle' })),
            but({ type: 'gamelle' }),
        );
        expect(apres.scores).toEqual([0, -2]);
    });

    it('une gamelle rentrante sur un score nul marque ET fait descendre a -1', () => {
        expect(appliquerBut(ETAT_INITIAL, but({ type: 'gamelle_rentrante' }))).toEqual({
            scores: [1, -1],
            multiplier: 1,
        });
    });
});

describe('rejouerButs', () => {
    it('une partie sans but est a 0-0, multiplicateur 1', () => {
        expect(rejouerButs([])).toEqual(ETAT_INITIAL);
    });

    it('une liste absente vaut une partie non commencee', () => {
        expect(rejouerButs(undefined)).toEqual(ETAT_INITIAL);
    });

    it('deux tirs milieu puis un but valent trois points', () => {
        const etat = rejouerButs([
            but({ position: 'midfield' }),
            but({ position: 'midfield' }),
            but(),
        ]);
        expect(etat).toEqual({ scores: [3, 0], multiplier: 1 });
    });

    it('le multiplicateur arme par une equipe profite a celle qui marque', () => {
        // Le multiplicateur est porte par la PARTIE, pas par l equipe : c est
        // le comportement historique, et il est volontaire.
        const etat = rejouerButs([
            but({ teamIndex: 0, position: 'midfield' }),
            but({ teamIndex: 1 }),
        ]);
        expect(etat).toEqual({ scores: [0, 2], multiplier: 1 });
    });

    it('rejoue une partie complete', () => {
        const etat = rejouerButs([
            but({ teamIndex: 0 }),
            but({ teamIndex: 1 }),
            but({ teamIndex: 1, type: 'gamelle' }),
            but({ teamIndex: 0, position: 'midfield' }),
            but({ teamIndex: 0 }),
        ]);
        expect(etat).toEqual({ scores: [2, 1], multiplier: 1 });
    });
});

describe('sansLeDernierBut', () => {
    it('retire le dernier element', () => {
        expect(sansLeDernierBut([1, 2, 3])).toEqual([1, 2]);
    });

    it('sur une liste vide, ne fait rien', () => {
        expect(sansLeDernierBut([])).toEqual([]);
    });

    it('sur une liste absente, ne fait rien', () => {
        expect(sansLeDernierBut(undefined)).toEqual([]);
    });

    it('ne modifie pas la liste d origine', () => {
        const liste = [1, 2, 3];
        sansLeDernierBut(liste);
        expect(liste).toEqual([1, 2, 3]);
    });
});

describe('annuler un but rend exactement l etat d avant', () => {
    // C EST LE DEFAUT DU CHANTIER 9.4. Chaque cas ci-dessous ajoute un but a
    // une partie en cours, puis l annule, et exige de retomber au bit pres sur
    // l etat de depart. L ancienne soustraction echouait sur les gamelles a
    // score nul.
    const departs: Array<[string, ButJoue[]]> = [
        ['partie vierge', []],
        ['score serre', [but({ teamIndex: 0 }), but({ teamIndex: 1 })]],
        ['multiplicateur arme', [but({ position: 'midfield' }), but({ position: 'midfield' })]],
        ['apres une gamelle', [but({ teamIndex: 0 }), but({ teamIndex: 1, type: 'gamelle' })]],
    ];

    const ajouts: Array<[string, ButJoue]> = [
        ['but normal', but()],
        ['but flash', but({ type: 'flash' })],
        ['tir milieu', but({ position: 'midfield' })],
        ['gamelle', but({ type: 'gamelle' })],
        ['gamelle rentrante', but({ type: 'gamelle_rentrante' })],
        ['contre son camp', but({ type: 'ownGoal' })],
        ['but de l autre equipe', but({ teamIndex: 1 })],
        ['gamelle de l autre equipe', but({ teamIndex: 1, type: 'gamelle' })],
    ];

    for (const [nomDepart, historique] of departs) {
        for (const [nomAjout, ajout] of ajouts) {
            it(`${nomDepart} + ${nomAjout}`, () => {
                const avant = rejouerButs(historique);
                const apres = rejouerButs([...historique, ajout]);
                const annule = rejouerButs(sansLeDernierBut([...historique, ajout]));

                expect(annule).toEqual(avant);

                // Sans ca le test ne prouverait rien : un moteur qui ignore
                // tous les buts passerait l assertion ci-dessus. On exige donc
                // que le but ait CHANGE quelque chose. Aucun but n en est
                // dispense : rien n est borne, une gamelle a toujours un effet.
                expect(apres).not.toEqual(avant);
            });
        }
    }

    it('annuler ne retire QUE le dernier but, pas la serie', () => {
        // Deux gamelles encaissees d affilee : 0, puis -1, puis -2.
        // L annulation ramene a -1, pas a 0.
        const gamelle = but({ type: 'gamelle' });
        const une = [gamelle];
        const deux = [gamelle, gamelle];

        expect(rejouerButs([]).scores).toEqual([0, 0]);
        expect(rejouerButs(une).scores).toEqual([0, -1]);
        expect(rejouerButs(deux).scores).toEqual([0, -2]);

        expect(rejouerButs(sansLeDernierBut(deux)).scores).toEqual([0, -1]);
        expect(rejouerButs(sansLeDernierBut(sansLeDernierBut(deux))).scores).toEqual([0, 0]);
    });

    it('annuler dix buts un par un ramene a zero', () => {
        const buts = Array.from({ length: 10 }, (_, i) =>
            but({ teamIndex: (i % 2) as 0 | 1, type: i % 3 === 0 ? 'gamelle' : 'normal' }),
        );
        let restants: ButJoue[] = buts;
        while (restants.length > 0) {
            restants = sansLeDernierBut(restants);
        }
        expect(rejouerButs(restants)).toEqual(ETAT_INITIAL);
    });
});

describe('etatEstCoherent', () => {
    const goals = [
        { type: 'normal', teamIndex: 0 },
        { type: 'normal', teamIndex: 1 },
    ] as unknown as Goal[];

    it('reconnait un etat juste', () => {
        expect(etatEstCoherent({ scores: [1, 1], multiplier: 1 }, goals)).toBe(true);
    });

    it('repere un score decale', () => {
        expect(etatEstCoherent({ scores: [2, 1], multiplier: 1 }, goals)).toBe(false);
    });

    it('repere un multiplicateur decale', () => {
        expect(etatEstCoherent({ scores: [1, 1], multiplier: 2 }, goals)).toBe(false);
    });

    it('un score negatif est coherent quand les buts le produisent', () => {
        const gamelleSeule = [{ type: 'gamelle', teamIndex: 0 }] as unknown as Goal[];
        expect(etatEstCoherent({ scores: [0, -1], multiplier: 1 }, gamelleSeule)).toBe(true);
        expect(etatEstCoherent({ scores: [0, 0], multiplier: 1 }, gamelleSeule)).toBe(false);
    });
});
