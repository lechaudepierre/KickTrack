/**
 * Tests du moteur de règles sociales.
 *
 * Le test le plus important de ce fichier est le dernier : le moteur ne peut
 * PAS modifier une partie. C'est le garde-fou du doc 33 — « les règles sociales
 * ne touchent jamais score, stats ni ELO ».
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from './engine';
import { BIBITIF_MODE, NORMAL_MODE, getMode, isNormalMode } from './modes';
import type { RuleEvent } from './engine';
import type { Team, Goal, GoalType, GoalPosition } from '@/types/game';

const team = (names: string[], score: number): Team => ({
    players: names.map(n => ({ userId: n, username: n })),
    color: 'blue',
    score,
});

const goal = (scorer: string, teamIndex: 0 | 1, type: GoalType = 'normal', position: GoalPosition = 'attack'): Goal => ({
    timestamp: new Date(0), type, position, scoredBy: scorer, scorerName: scorer, teamIndex, points: 1,
});

const teams = (): [Team, Team] => [team(['Alice', 'Bob'], 3), team(['Chloé', 'David'], 1)];

describe('mode normal', () => {
    it('ne déclenche jamais rien — c\'est le défaut inchangé', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() };
        expect(evaluate(NORMAL_MODE, event)).toEqual([]);
    });

    it('est le repli pour tout identifiant inconnu ou absent', () => {
        expect(getMode(undefined).id).toBe('normal');
        expect(getMode('mode_qui_nexiste_pas').id).toBe('normal');
        expect(isNormalMode(null)).toBe(true);
    });
});

describe('bibitif — gamelle', () => {
    it('vise l\'équipe qui ENCAISSE, pas le buteur', () => {
        // Alice (équipe 0) met une gamelle → c'est l'équipe 1 qui boit.
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.ruleId).toBe('gamelle');
        expect(message.text).toContain('Chloé et David');
        expect(message.text).not.toContain('Alice');
    });

    it('se déclenche à chaque gamelle', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() };
        const fired = new Set(['gamelle']);
        expect(evaluate(BIBITIF_MODE, event, fired)).toHaveLength(1);
    });

    it('un but normal déclenche la gorgée, pas la gamelle', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'normal'), teams: teams() };
        const ids = evaluate(BIBITIF_MODE, event).map(m => m.ruleId);
        expect(ids).toEqual(['but_encaisse']);
    });
});

describe('bibitif — but du gardien', () => {
    it('vise l\'équipe qui encaisse', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Bob', 0, 'normal', 'goalkeeper'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.ruleId).toBe('but_gardien');
        expect(message.text).toContain('Chloé et David');
    });

    it('ANNULE la simple gorgée — une action, un seul gage', () => {
        // Sans la priorité déclarative, ce but produirait « une gorgée » ET
        // « un demi-affond » : deux sanctions pour une seule action.
        const event: RuleEvent = { kind: 'goal', goal: goal('Bob', 0, 'normal', 'goalkeeper'), teams: teams() };
        const ids = evaluate(BIBITIF_MODE, event).map(m => m.ruleId);
        expect(ids).toEqual(['but_gardien']);
        expect(ids).not.toContain('but_encaisse');
    });
});

describe('bibitif — sévérité croissante des gamelles', () => {
    it('gamelle simple : demi-affond', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.text).toContain('demi-affond');
    });

    it('gamelle rentrante : affond entier, et pas un demi', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle_rentrante'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.text).toContain('un affond');
        expect(message.text).not.toContain('demi');
    });

    it('les deux gamelles ne disent pas la même chose', () => {
        const g = evaluate(BIBITIF_MODE, { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() });
        const gr = evaluate(BIBITIF_MODE, { kind: 'goal', goal: goal('Alice', 0, 'gamelle_rentrante'), teams: teams() });
        expect(g[0].text).not.toBe(gr[0].text);
        expect(g[0].title).not.toBe(gr[0].title);
    });
});

describe('bibitif — défaite sèche', () => {
    it('se déclenche quand le perdant finit à zéro', () => {
        const event: RuleEvent = { kind: 'end', teams: [team(['Alice'], 6), team(['Chloé'], 0)], winner: 0 };
        const messages = evaluate(BIBITIF_MODE, event);
        expect(messages.map(m => m.ruleId)).toContain('defaite_seche');
    });

    it('ne se déclenche pas si le perdant a marqué', () => {
        const event: RuleEvent = { kind: 'end', teams: [team(['Alice'], 6), team(['Chloé'], 1)], winner: 0 };
        expect(evaluate(BIBITIF_MODE, event)).toEqual([]);
    });

    it('ne se répète pas — elle n\'est pas marquée repeatable', () => {
        const event: RuleEvent = { kind: 'end', teams: [team(['Alice'], 6), team(['Chloé'], 0)], winner: 0 };
        expect(evaluate(BIBITIF_MODE, event, new Set(['defaite_seche']))).toEqual([]);
    });

    it('ne double pas le message quand deux règles disent la même chose', () => {
        // « Six à zéro » et « défaite sèche » portent le même gage.
        const event: RuleEvent = { kind: 'end', teams: [team(['Alice'], 6), team(['Chloé'], 0)], winner: 0 };
        const textes = evaluate(BIBITIF_MODE, event).map(m => m.text);
        expect(new Set(textes).size).toBe(textes.length);
    });
});

describe('garde-fou : le moteur ne peut pas modifier une partie', () => {
    it('ne renvoie QUE des messages — aucun champ de score', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: teams() };
        for (const message of evaluate(BIBITIF_MODE, event)) {
            expect(Object.keys(message).sort()).toEqual(['ruleId', 'text', 'title']);
        }
    });

    it('ne mute pas l\'état qu\'on lui passe', () => {
        const state = teams();
        const before = JSON.stringify(state);
        evaluate(BIBITIF_MODE, { kind: 'goal', goal: goal('Alice', 0, 'gamelle'), teams: state });
        expect(JSON.stringify(state)).toBe(before);
    });
});

describe('six à zéro — déclenchement en direct', () => {
    it('tombe au moment où le score est atteint, pendant la partie', () => {
        const event: RuleEvent = {
            kind: 'goal',
            goal: goal('Alice', 0),
            teams: [team(['Alice'], 6), team(['Chloé'], 0)],
        };
        const ids = evaluate(BIBITIF_MODE, event).map(m => m.ruleId);
        expect(ids).toContain('humiliation');
    });

    it('ne tombe pas à 5-0', () => {
        const event: RuleEvent = {
            kind: 'goal',
            goal: goal('Alice', 0),
            teams: [team(['Alice'], 5), team(['Chloé'], 0)],
        };
        expect(evaluate(BIBITIF_MODE, event).map(m => m.ruleId)).not.toContain('humiliation');
    });

    it('ne se déclenche qu\'une fois — elle n\'est pas repeatable', () => {
        const event: RuleEvent = {
            kind: 'goal',
            goal: goal('Alice', 0),
            teams: [team(['Alice'], 6), team(['Chloé'], 0)],
        };
        expect(evaluate(BIBITIF_MODE, event, new Set(['humiliation'])).map(m => m.ruleId))
            .not.toContain('humiliation');
    });
});

describe('bibitif — flash et contre son camp', () => {
    it('un but flash vaut un demi-affond, pas une gorgée', () => {
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'flash'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.ruleId).toBe('but_flash');
        expect(message.text).toContain('demi-affond');
    });

    it('le but contre son camp vise CELUI QUI MARQUE, contrairement aux autres', () => {
        // Alice (équipe 0) met contre son camp : c'est elle qui boit, pas l'adversaire.
        const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, 'ownGoal'), teams: teams() };
        const [message] = evaluate(BIBITIF_MODE, event);
        expect(message.ruleId).toBe('csc');
        expect(message.text).toContain('Alice');
        expect(message.text).not.toContain('Chloé');
    });

    it('aucun but ne produit deux gages à la fois', () => {
        const types = ['normal', 'flash', 'gamelle', 'gamelle_rentrante', 'ownGoal'] as const;
        for (const type of types) {
            const event: RuleEvent = { kind: 'goal', goal: goal('Alice', 0, type), teams: teams() };
            expect(evaluate(BIBITIF_MODE, event).length).toBeLessThanOrEqual(1);
        }
    });
});
