/**
 * LE MOTEUR DE BUTS — l'état d'une partie se REJOUE, il ne se corrige pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE — chantier 9.4
 * ═══════════════════════════════════════════════════════════════════════════
 * `removeLastGoal()` annulait un but en soustrayant : elle retirait les points
 * du marqueur, remettait celui de la gamelle, et restaurait le multiplicateur
 * depuis `previousMultiplier`. Le code le reconnaissait lui-même en
 * commentaire : « doesn't perfectly restore multiplier state ».
 *
 * Une annulation par soustraction n'est exacte que si l'ajout a été exactement
 * inverse — même ordre, mêmes règles, même multiplicateur. Deux bouts de code
 * séparés devaient rester d'accord pour toujours, sans que rien ne le vérifie.
 * Sur 811 parties de production qui portent des buts, 48 ne retombent pas sur
 * le score que leurs buts produisent (relevé le 23/08).
 *
 * On ne soustrait donc plus. L'état d'une partie — les deux scores ET le
 * multiplicateur — est REJOUÉ depuis la liste des buts, qui fait seule foi.
 * Ajouter un but, c'est rejouer la liste plus un ; annuler, c'est rejouer la
 * liste moins un. L'annulation redevient exacte par construction : il n'existe
 * plus deux calculs qui puissent cesser d'être d'accord.
 *
 * C'est la même correction que le chantier 9.1 sur le score, appliquée un cran
 * plus bas : dériver plutôt qu'entretenir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN SCORE NÉGATIF EST NORMAL
 * ═══════════════════════════════════════════════════════════════════════════
 * Une gamelle encaissée à 0 met bien l'équipe à -1. C'est la règle du jeu, pas
 * un accident : neuf parties de production le portent, et c'est justifié.
 * Aucun plancher ici — le score suit les buts, quel qu'il soit.
 *
 * Module pur : aucun accès à Firestore, entièrement testable.
 */

import type { Goal, GoalPosition, GoalType } from '@/types/game';

/** L'état d'une partie à un instant donné : les deux scores et le multiplicateur. */
export interface EtatDeJeu {
    scores: [number, number];
    /** Ce que vaudra le PROCHAIN but tiré depuis le terrain. Toujours >= 1. */
    multiplier: number;
}

/** Début de partie : 0-0, prochain but à 1 point. */
export const ETAT_INITIAL: EtatDeJeu = { scores: [0, 0], multiplier: 1 };

/**
 * Ce que le moteur a besoin de savoir d'un but. Volontairement plus étroit que
 * `Goal` : ni le marqueur ni l'horodatage n'entrent dans le calcul du score.
 */
export interface ButJoue {
    type: GoalType;
    position?: GoalPosition;
    teamIndex: 0 | 1;
}

/** Le détail chiffré d'un but, une fois l'état courant connu. */
export interface EffetDuBut {
    /** Points portés au crédit de l'équipe qui a tiré. */
    points: number;
    /** Variation du score adverse — négative pour une gamelle. */
    variationAdverse: number;
    /** Le multiplicateur APRÈS ce but. */
    multiplierSuivant: number;
}

/**
 * L'effet d'un but, sans l'appliquer.
 *
 * Exporté parce que `addGoal` a besoin de `points` pour l'écrire sur le but
 * lui-même : c'est ce qui permet de relire la valeur d'un but dans la timeline
 * sans rejouer toute la partie.
 */
export function effetDuBut(etat: EtatDeJeu, but: ButJoue): EffetDuBut {
    const multiplier = multiplierValide(etat.multiplier);

    // Un tir depuis le milieu ne marque pas : il arme le but suivant.
    if (but.position === 'midfield') {
        return { points: 0, variationAdverse: 0, multiplierSuivant: multiplier + 1 };
    }

    switch (but.type) {
        case 'normal':
        case 'flash':
            // Le seul cas qui encaisse le multiplicateur — et qui le remet à 1.
            return { points: multiplier, variationAdverse: 0, multiplierSuivant: 1 };

        case 'gamelle':
            // Ne rapporte rien : fait perdre un point à l'adversaire.
            return { points: 0, variationAdverse: -1, multiplierSuivant: multiplier };

        case 'gamelle_rentrante':
            // Rapporte un point ET en retire un à l'adversaire.
            return { points: 1, variationAdverse: -1, multiplierSuivant: multiplier };

        case 'ownGoal':
            // Contre son camp : le point va à l'adversaire, pas au tireur.
            // Jamais émis par l'interface à ce jour (aucun en production), mais
            // le type l'autorise et le mode Bibitif s'en sert comme déclencheur.
            return { points: 0, variationAdverse: 1, multiplierSuivant: multiplier };
    }

    // Type inconnu : un point simple, sans toucher au multiplicateur.
    //
    // Ce n'est pas de la théorie. Dix-neuf buts de production portent
    // `type: 'attack'` — une version ancienne de l'application y écrivait la
    // POSITION au lieu du type. Le code d'alors les comptait pour un point ;
    // les compter pour zéro rejouerait ces parties-là à 0-0. Le repli existe
    // donc pour rester fidèle à ce qui a été joué.
    //
    // Aucun chemin actuel ne peut produire un type inconnu : `addGoal` n'accepte
    // que les valeurs de `GoalType`.
    return { points: 1, variationAdverse: 0, multiplierSuivant: multiplier };
}

/**
 * L'état après un but.
 *
 * Un score peut descendre sous zéro : une gamelle encaissée à 0 met bien à -1.
 */
export function appliquerBut(etat: EtatDeJeu, but: ButJoue): EtatDeJeu {
    const { points, variationAdverse, multiplierSuivant } = effetDuBut(etat, but);
    const tireur = but.teamIndex === 1 ? 1 : 0;
    const adverse = tireur === 0 ? 1 : 0;

    const scores: [number, number] = [etat.scores[0], etat.scores[1]];
    scores[tireur] = valeurSure(scores[tireur] + points);
    scores[adverse] = valeurSure(scores[adverse] + variationAdverse);

    return { scores, multiplier: multiplierValide(multiplierSuivant) };
}

/**
 * L'état d'une partie, rejoué depuis sa liste de buts.
 *
 * C'est LA fonction : tout le reste du fichier existe pour elle. Le score et le
 * multiplicateur écrits sur une partie sont toujours le résultat de cet appel,
 * jamais d'un calcul incrémental.
 */
export function rejouerButs(buts: readonly ButJoue[] | undefined): EtatDeJeu {
    let etat = ETAT_INITIAL;
    for (const but of buts ?? []) {
        etat = appliquerBut(etat, but);
    }
    return etat;
}

/**
 * Les buts d'une partie moins le dernier — autrement dit, l'annulation.
 *
 * Rendue explicite plutôt que laissée à un `slice(0, -1)` chez l'appelant :
 * c'est l'opération métier, et elle doit se lire comme telle.
 */
export function sansLeDernierBut<T>(buts: readonly T[] | undefined): T[] {
    const liste = buts ?? [];
    return liste.length === 0 ? [] : liste.slice(0, -1);
}

/**
 * Le score enregistré sur une partie correspond-il à ses buts ?
 *
 * Sert aux contrôles sur les parties d'avant cette correction : leur score a
 * été écrit par soustraction, et peut ne pas correspondre à leurs buts.
 */
export function etatEstCoherent(etat: EtatDeJeu, buts: readonly Goal[] | undefined): boolean {
    const attendu = rejouerButs(buts);
    return attendu.scores[0] === etat.scores[0]
        && attendu.scores[1] === etat.scores[1]
        && attendu.multiplier === etat.multiplier;
}

/**
 * Un score reste un nombre.
 *
 * Ne borne rien : le négatif est légitime. Ne protège que du `NaN`, qui se
 * propagerait silencieusement dans toutes les comparaisons de vainqueur.
 */
function valeurSure(valeur: number): number {
    return Number.isFinite(valeur) ? valeur : 0;
}

/** Un multiplicateur absent ou absurde vaut 1 : le prochain but comptera pour 1. */
function multiplierValide(valeur: number | undefined): number {
    return typeof valeur === 'number' && Number.isFinite(valeur) && valeur >= 1
        ? Math.floor(valeur)
        : 1;
}
