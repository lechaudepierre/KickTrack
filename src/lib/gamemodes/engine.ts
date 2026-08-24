/**
 * MOTEUR DE RÈGLES SOCIALES — pur, sans effet de bord.
 *
 * Prend un événement de partie et l'état du mode, rend la liste des messages
 * à afficher. Ne lit rien, n'écrit rien, ne connaît pas Firebase.
 *
 * ⚠️ Ce moteur ne peut PAS modifier une partie. C'est structurel : il ne
 *    retourne que des messages. Aucun chemin de code ne lui permet de toucher
 *    au score, aux stats ou à l'ELO — c'est le garde-fou du doc 33, appliqué
 *    par le typage plutôt que par la discipline.
 */

import type { Goal, Team } from '@/types/game';
import type { GameMode, Rule } from './types';

export interface RuleEvent {
    kind: 'goal' | 'end';
    /** Le but qui vient d'être marqué (kind: 'goal'). */
    goal?: Goal;
    /** État des équipes APRÈS l'événement. */
    teams: [Team, Team];
    /** Index de l'équipe gagnante (kind: 'end'). */
    winner?: 0 | 1;
}

export interface TriggeredMessage {
    ruleId: string;
    title: string;
    text: string;
}

/** Nom à substituer à `{joueur}` selon la cible de la règle. */
function resolveTarget(rule: Rule, event: RuleEvent): string {
    if (event.kind === 'end') {
        if (event.winner === undefined) return 'Le perdant';
        const losers = event.teams[1 - event.winner].players;
        return losers.map(p => p.username).join(' et ') || 'Le perdant';
    }

    const goal = event.goal;
    if (!goal) return 'Le joueur';

    const target = rule.trigger.kind === 'goal' ? (rule.trigger.target ?? 'scorer') : 'scorer';
    if (target === 'scorer') return goal.scorerName;

    // « conceding » : l'équipe qui a encaissé, donc l'autre que celle du buteur.
    const conceding = event.teams[1 - goal.teamIndex].players;
    return conceding.map(p => p.username).join(' et ') || 'L\'adversaire';
}

function matches(rule: Rule, event: RuleEvent): boolean {
    const t = rule.trigger;

    switch (t.kind) {
        case 'goal': {
            if (event.kind !== 'goal' || !event.goal) return false;
            if (t.goalType && event.goal.type !== t.goalType) return false;
            if (t.position && event.goal.position !== t.position) return false;
            return true;
        }

        case 'score': {
            // Volontairement lié aux buts uniquement : le score se franchit
            // PENDANT la partie. Le laisser matcher aussi la fin ferait tomber
            // deux fois le même gage — une fois en direct, une fois aux
            // résultats. Les règles de fin ont leur propre déclencheur.
            if (event.kind !== 'goal') return false;
            const scores = [event.teams[0].score, event.teams[1].score].sort((a, b) => b - a);
            return scores[0] === t.exact[0] && scores[1] === t.exact[1];
        }

        case 'gap': {
            if (event.kind !== 'goal') return false;
            return Math.abs(event.teams[0].score - event.teams[1].score) >= t.atLeast;
        }

        case 'end': {
            if (event.kind !== 'end' || event.winner === undefined) return false;
            const winnerScore = event.teams[event.winner].score;
            const loserScore = event.teams[1 - event.winner].score;
            if (t.shutout && loserScore !== 0) return false;
            if (t.exact && (winnerScore !== t.exact[0] || loserScore !== t.exact[1])) return false;
            return true;
        }
    }
}

/**
 * Évalue toutes les règles d'un mode contre un événement.
 *
 * @param alreadyFired identifiants des règles non répétables déjà déclenchées
 *                     dans cette partie. Évite qu'un « 6-0 » se répète.
 */
export function evaluate(
    mode: GameMode,
    event: RuleEvent,
    alreadyFired: ReadonlySet<string> = new Set()
): TriggeredMessage[] {
    const messages: TriggeredMessage[] = [];

    for (const rule of mode.rules) {
        if (!rule.repeatable && alreadyFired.has(rule.id)) continue;
        if (!matches(rule, event)) continue;

        const text = rule.effect.text.replace('{joueur}', resolveTarget(rule, event));

        // Deux règles différentes peuvent aboutir au même gage (« 6-0 » et
        // « défaite sèche » disent la même chose). On ne l'affiche qu'une fois :
        // un message répété donne l'impression d'un bug.
        if (messages.some(m => m.text === text)) continue;

        messages.push({ ruleId: rule.id, title: rule.effect.title, text });
    }

    // Une règle plus forte annule les règles qu'elle recouvre : un but marqué
    // depuis le gardien ne doit pas produire à la fois « une gorgée » et
    // « un demi-affond ». Appliqué après coup pour que l'ordre de déclaration
    // des règles n'ait pas d'importance.
    const superseded = new Set(
        mode.rules
            .filter(rule => messages.some(m => m.ruleId === rule.id))
            .flatMap(rule => rule.supersedes ?? [])
    );

    return messages.filter(m => !superseded.has(m.ruleId));
}
