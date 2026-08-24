/**
 * MODES DE JEU — modèle de règles
 * Doc/v2-refactor/33-modes-de-jeu.md · bloc 7
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX FAMILLES DE RÈGLES, DE NATURE DIFFÉRENTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Règles de SCORE affectent score, multiplicateur, ELO → l'app calcule
 * Règles SOCIALES n'affectent RIEN ; l'app détecte et affiche un message
 * → ce sont les joueurs au bar qui exécutent
 *
 * ⚠️ V1 = RÈGLES SOCIALES UNIQUEMENT (décision du doc 33).
 * Le moteur de score de `addGoal()` n'est pas modifié. Une couche d'écoute
 * s'ajoute par-dessus, et c'est tout.
 *
 * La structure ci-dessous est néanmoins conçue pour ne pas exclure les
 * règles de score plus tard : une règle a un `effect` typé, et V1
 * n'implémente que `message`. Ajouter un effet ne cassera rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GARDE-FOUS ABSOLUS
 * ═══════════════════════════════════════════════════════════════════════════
 * • Une règle sociale ne touche JAMAIS score, stats ni ELO.
 * • Une partie en mode variante reste une partie NORMALE pour les stats et
 * l'ELO. Le mode ne change que ce qui s'affiche.
 */

import type { GoalType, GoalPosition } from '@/types/game';
import type { LadderId } from '@/lib/game/ladders';

// ─── Déclencheurs ────────────────────────────────────────────────────────────

/** Un but vient d'être marqué, avec un type et/ou une position donnés. */
export interface GoalTrigger {
    kind: 'goal';
    /** Type de but. Omis = n'importe lequel. */
    goalType?: GoalType;
    /** Position de tir. Omis = n'importe laquelle. */
    position?: GoalPosition;
    /**
     * Le message vise-t-il celui qui a marqué, ou l'équipe qui a encaissé ?
     * Une gamelle se boit du côté de celui qui l'a prise.
     */
    target?: 'scorer' | 'conceding';
}

/** Le score atteint une valeur exacte. */
export interface ScoreTrigger {
    kind: 'score';
    /** Score exact, dans l'ordre [gagnant, perdant] du moment. */
    exact: [number, number];
}

/** L'écart entre les deux équipes atteint une valeur. */
export interface GapTrigger {
    kind: 'gap';
    atLeast: number;
}

/** La partie se termine. */
export interface EndTrigger {
    kind: 'end';
    /** Score final exact, dans l'ordre [vainqueur, perdant]. Omis = toute fin. */
    exact?: [number, number];
    /** Le perdant n'a marqué aucun but. */
    shutout?: boolean;
}

export type Trigger = GoalTrigger | ScoreTrigger | GapTrigger | EndTrigger;

// ─── Effets ──────────────────────────────────────────────────────────────────

/**
 * V1 n'implémente que `message`.
 * Les effets de score (multiplicateur, points, malus) viendront s'ajouter ici
 * sans casser les modes existants.
 */
export interface MessageEffect {
    kind: 'message';
    /** Intitulé court de la règle, affiché en gras. */
    title: string;
    /** Texte affiché. `{joueur}` est remplacé par le nom concerné. */
    text: string;
}

export type Effect = MessageEffect;

// ─── Règle & mode ────────────────────────────────────────────────────────────

export interface Rule {
    id: string;
    trigger: Trigger;
    effect: Effect;
    /**
     * La règle peut-elle se déclencher plusieurs fois dans une partie ?
     * Une gamelle, oui. Un « 6-0 », une seule fois.
     */
    repeatable?: boolean;
    /**
     * Identifiants de règles que celle-ci annule quand elle se déclenche.
     *
     * Sert quand une action correspond à plusieurs règles et qu'une seule doit
     * s'appliquer : un but marqué depuis le gardien est aussi un but encaissé,
     * mais on n'annonce que le gage le plus fort. Sans ça, le joueur reçoit
     * deux sanctions pour une seule action.
     */
    supersedes?: string[];
}

/**
 * Une règle expliquée au joueur, avant la partie.
 *
 * Séparé de `Rule` volontairement : certaines règles sont appliquées par le
 * moteur de score (`addGoal`) et non par le moteur de règles sociales. Le mode
 * normal n'a donc aucune `Rule` mais plusieurs `ExplainedRule`.
 */
export interface ExplainedRule {
    title: string;
    detail: string;
}

/**
 * Réglage d'un mode au chronomètre — chantier 7.10.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI C'EST DE LA DONNÉE ET PAS DU CODE
 * ═══════════════════════════════════════════════════════════════════════════
 * Un troisième mode chrono doit se régler en cinq lignes ici, sans qu'on
 * touche au moteur. Si le temps de départ ou le bonus vivaient dans une
 * condition, chaque nouveau mode ajouterait un `if` — et au cinquième, plus
 * personne ne saurait ce que fait vraiment le chronomètre.
 */
export interface ModeTiming {
    /** Temps au coup d'envoi, en secondes. */
    baseSeconds: number;
    /** Secondes ajoutées à chaque but marqué, quelle que soit l'équipe. */
    bonusPerGoal: number;
    /**
     * Que faire si les deux équipes sont à égalité quand le chrono atteint zéro.
     *
     * `golden-goal` : plus de limite, le prochain but termine la partie.
     * `extra-time`  : on ajoute `extraSeconds` et on rejoue la même question.
     */
    tieBreak: 'golden-goal' | 'extra-time';
    /** Durée d'une prolongation, pour `extra-time`. */
    extraSeconds?: number;
}

export interface GameMode {
    id: string;
    name: string;
    description: string;
    /** Règles détectées et affichées pendant la partie. */
    rules: Rule[];
    /** Règles montrées au joueur dans la fiche du mode. */
    explained: ExplainedRule[];
    /**
     * La partie rapporte-t-elle des packs, et compte-t-elle dans les
     * statistiques principales ?
     *
     * ⚠️ Bibitif est passé à `false` le 21/08. Le changement vaut pour
     * l'avenir : on ne réécrit pas l'historique, ce serait retirer de l'ELO à
     * des joueurs pour des parties jouées sous une autre règle.
     */
    rewards: boolean;
    /**
     * Quelle échelle d'ELO cette partie alimente-t-elle ? Absent = aucune.
     *
     * SÉPARÉ de `rewards`, et c'est la décision de Sacha du 22/08 : le Blitz
     * a son propre classement mais ne donne ni pack ni « partie jouée ». Un
     * drapeau unique n'aurait pas pu exprimer ça.
     *
     * Un quatrième classement se déclare ici, en donnée. Surtout pas un champ
     * `blitzElo` de plus sur le profil : au troisième, plus personne ne tient
     * les trois historiques en accord.
     */
    ladder?: LadderId;
    /**
     * La partie entre-t-elle dans les statistiques générales du joueur —
     * parties jouées, victoires, buts, historique quotidien, stades ?
     *
     * ⚠️ PROVISOIRE pour le Blitz. Sacha, 22/08 : « le Blitz compte en ELO,
     * mais pas forcément en récompenses ni en parties jouées ». Le « pas
     * forcément » n'est pas tranché ; posé à `false`, parce qu'on peut
     * toujours commencer à compter, alors qu'on ne peut pas décompter après
     * coup sans réécrire l'historique.
     *
     * TROIS drapeaux et pas un seul, parce que les trois diffèrent vraiment :
     * le Blitz a un classement sans récompense ni statistiques, le Bibitif a
     * des statistiques sans classement ni récompense.
     */
    countsInStats: boolean;
    /** Présent = le mode se joue au chronomètre. Absent = pas de limite de temps. */
    timing?: ModeTiming;
}
