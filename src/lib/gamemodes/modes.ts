/**
 * LES MODES DE JEU — configuration éditable à la main.
 *
 * Doc 33 : « Définition des modes en fichier/données éditable à la main
 * (pas d'UI admin pour l'instant ; l'équipe de 3 édite la config directement). »
 *
 * ===========================================================================
 * COMMENT MODIFIER LES RÈGLES
 * ===========================================================================
 * Ajouter un mode        : ajouter une entrée à MODES.
 * Ajouter une règle      : ajouter une entrée au tableau `rules` du mode.
 * Modifier un texte      : éditer `effect.text`.
 * Documenter une règle   : ajouter une entrée à `explained`.
 *
 * `rules` et `explained` sont volontairement séparés :
 *   - `rules`     ce que l'app DÉTECTE et affiche pendant la partie
 *   - `explained` ce qu'on MONTRE au joueur avant de lancer, dans la fiche
 *
 * Le mode normal a des `explained` mais aucune `rules` : ses règles de score
 * sont appliquées par le moteur de jeu lui-même (`addGoal`), pas par ce
 * fichier. On les documente ici pour que le joueur puisse les lire.
 *
 * ATTENTION : ces textes décrivent le comportement réel de `addGoal()`.
 * Si le moteur de score change, ces textes doivent changer avec.
 */

import type { GameMode } from './types';

/**
 * Le mode normal est le défaut spécial (doc 33) : le moteur actuel, robuste,
 * inchangé, sans aucune règle sociale par-dessus. Les autres modes sont des
 * variantes du mode normal, pas des remplacements.
 */
export const NORMAL_MODE: GameMode = {
    id: 'normal',
    name: 'Normal',
    description: 'Les règles classiques du kicker.',
    // Le classement de RÉFÉRENCE, et le seul mode qui rapporte des packs.
    rewards: true,
    countsInStats: true,
    ladder: 'normal',
    rules: [],
    explained: [
        {
            title: 'But normal',
            detail: 'Vaut le multiplicateur en cours. Après un but, le multiplicateur retombe à 1.',
        },
        {
            title: 'Tir du milieu',
            detail: 'Ne rapporte aucun point, mais fait monter le multiplicateur d\'un cran : le prochain but vaudra double, puis triple si un second tir du milieu passe. Vaut aussi bien en 1v1 qu\'en 2v2.',
        },
        {
            title: 'Gamelle',
            detail: 'Ne rapporte aucun point à celui qui la met, mais fait perdre un point à l\'adversaire.',
        },
        {
            title: 'Gamelle rentrante',
            detail: 'Rapporte un point à celui qui la met, ET fait perdre un point à l\'adversaire.',
        },
        {
            title: 'But contre son camp',
            detail: 'Rapporte un point à l\'équipe adverse. Le multiplicateur n\'est pas affecté.',
        },
        {
            title: 'But flash',
            detail: 'Compte comme un but normal pour le score. Il est distingué pour les statistiques et les badges.',
        },
    ],
};

/**
 * Mode bibitif.
 *
 * ATTENTION — À RELIRE PAR L'ÉQUIPE AVANT LE DROP.
 * Les gages ci-dessous viennent des indications de Sacha (20/08). Leur
 * formulation exacte, leur sévérité et la liste elle-même doivent être
 * validées par les 3 créateurs avant d'ouvrir la V2 à tout le monde.
 *
 * Deux tableaux, deux rôles :
 *   `rules`     ce que l'app détecte automatiquement et affiche en jeu
 *   `explained` ce que le joueur lit dans la fiche du mode
 *
 * Certaines règles n'existent QUE dans `explained` : l'app ne sait pas les
 * détecter. Le but « avec une bande » en est l'exemple — il n'y a aucun type
 * de but correspondant dans le moteur, donc personne ne peut l'enregistrer.
 * Ces règles se jouent à l'honneur, entre joueurs. C'est volontaire : mieux
 * vaut une règle affichée et non détectée qu'une règle absente.
 */
export const BIBITIF_MODE: GameMode = {
    id: 'bibitif',
    name: 'Bibitif',
    // Le SEUL mode qui ne compte nulle part (décision de Sacha, 22/08) : ni
    // classement, ni pack, ni statistiques. Une soirée bibitif ne doit pas
    // déformer les chiffres de personne — c'est un mode de fête, pas de jeu.
    //
    // Le changement ne vaut que pour l'AVENIR : les parties déjà jouées
    // restent comptées. Les décompter reviendrait à retirer des victoires à
    // des gens pour des matchs joués sous une autre règle.
    rewards: false,
    countsInStats: false,
    description: 'Mêmes règles de score, mais certaines actions se paient au bar.',
    rules: [
        {
            id: 'but_encaisse',
            // Limité aux buts qui marquent vraiment (normal et flash) : une
            // gamelle a son propre gage, plus fort. Sans cette restriction, une
            // gamelle rentrante afficherait deux messages d'un coup.
            trigger: { kind: 'goal', goalType: 'normal', target: 'conceding' },
            effect: { kind: 'message', title: 'But encaissé', text: '{joueur} : une gorgée.' },
            repeatable: true,
        },
        {
            id: 'but_flash',
            trigger: { kind: 'goal', goalType: 'flash', target: 'conceding' },
            effect: { kind: 'message', title: 'But flash encaissé', text: '{joueur} : un demi-affond.' },
            repeatable: true,
        },
        {
            id: 'csc',
            // Le seul gage du mode qui vise CELUI QUI MARQUE : envoyer le
            // ballon dans son propre but n'est pas quelque chose qu'on subit.
            trigger: { kind: 'goal', goalType: 'ownGoal', target: 'scorer' },
            effect: { kind: 'message', title: 'But contre son camp', text: '{joueur} : un demi-affond.' },
            repeatable: true,
        },
        {
            id: 'gamelle',
            trigger: { kind: 'goal', goalType: 'gamelle', target: 'conceding' },
            effect: { kind: 'message', title: 'Gamelle encaissée', text: '{joueur} : un demi-affond.' },
            repeatable: true,
        },
        {
            id: 'gamelle_rentrante',
            trigger: { kind: 'goal', goalType: 'gamelle_rentrante', target: 'conceding' },
            effect: { kind: 'message', title: 'Gamelle rentrante encaissée', text: '{joueur} : un affond.' },
            repeatable: true,
        },
        {
            id: 'but_gardien',
            // ATTENTION, À TRANCHER : c'est l'équipe qui ENCAISSE qui boit,
            // par cohérence avec toutes les autres règles du mode. Se faire
            // marquer depuis le gardien adverse est l'humiliation, pas l'exploit.
            // Si l'équipe préfère sanctionner le buteur, passer `target` à 'scorer'.
            trigger: { kind: 'goal', position: 'goalkeeper', target: 'conceding' },
            effect: { kind: 'message', title: 'But depuis le gardien', text: '{joueur} : un demi-affond.' },
            repeatable: true,
            // Un but du gardien est aussi un but encaissé : on n'annonce que le
            // gage le plus fort, sinon la même action produit deux sanctions.
            supersedes: ['but_encaisse'],
        },
        {
            id: 'humiliation',
            // Six à zéro : le message tombe au moment où le score est atteint,
            // pendant la partie. C'est là que ça se joue.
            trigger: { kind: 'score', exact: [6, 0] },
            effect: { kind: 'message', title: 'Six à zéro', text: 'Le perdant paie une bière spéciale.' },
        },
        {
            id: 'defaite_seche',
            // Filet de sécurité pour les parties qui ne passent pas par 6-0
            // exactement : partie en 11 points, abandon, gamelle qui fait
            // sauter le score. Le moteur déduplique si les deux tombent.
            trigger: { kind: 'end', shutout: true },
            effect: { kind: 'message', title: 'Défaite sèche', text: 'Le perdant paie une bière spéciale.' },
        },
    ],
    explained: [
        {
            title: 'Ne compte nulle part',
            detail: 'Une partie en bibitif ne fait bouger ni ton ELO, ni tes statistiques, ni tes packs. C\'est un mode de fête : il ne doit déformer les chiffres de personne.',
        },
        {
            title: 'But encaissé',
            detail: 'À chaque but encaissé, l\'équipe qui le prend boit une gorgée.',
        },
        {
            title: 'But flash encaissé',
            detail: 'Un demi-affond pour l\'équipe qui l\'encaisse.',
        },
        {
            title: 'But contre son camp',
            detail: 'Un demi-affond pour celui qui l\'a mis dans son propre but.',
        },
        {
            title: 'Gamelle encaissée',
            detail: 'Un demi-affond pour l\'équipe qui la prend.',
        },
        {
            title: 'Gamelle rentrante encaissée',
            detail: 'Un affond pour l\'équipe qui la prend. C\'est la sanction la plus lourde du mode.',
        },
        {
            title: 'But depuis le gardien',
            detail: 'Un demi-affond pour l\'équipe qui l\'encaisse.',
        },
        {
            title: 'But avec une bande',
            detail: 'Un tir sur le mur qui rentre : un demi-affond. L\'app ne sait pas détecter ce type de but, cette règle se joue à l\'honneur.',
        },
        {
            title: 'Six à zéro',
            detail: 'Le perdant paie une bière spéciale.',
        },
    ],
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODES AU CHRONOMÈTRE — chantier 7.10
 * ═══════════════════════════════════════════════════════════════════════════
 * Premiers modes qui touchent à la MÉCANIQUE et non plus seulement à
 * l'ambiance : ils décident quand la partie s'arrête, et ils ne comptent pas
 * au classement.
 *
 * Tout leur comportement tient dans `timing`. Ajouter un troisième mode chrono
 * ne demande aucune ligne de moteur.
 */
export const CHRONO_MODE: GameMode = {
    id: 'chrono',
    name: 'Chrono',
    description: 'Six minutes au départ, et chaque but rallonge le match.',
    // Ni classement, ni statistiques — mais les PACKS, oui (Sacha, 23/08).
    //
    // Le seuil de buts ne s'applique pas aux modes au chronomètre : un blitz se
    // termine souvent à 3-2. C'est la DURÉE qui protège du farm — on ne peut pas
    // finir un chrono de six minutes en moins de six minutes.
    rewards: true,
    countsInStats: false,
    timing: {
        baseSeconds: 6 * 60,
        bonusPerGoal: 30,
        // Un match posé mérite une fin franche : le prochain but tranche.
        tieBreak: 'golden-goal',
    },
    rules: [],
    explained: [
        {
            title: 'Six minutes au départ',
            detail: 'Le chronomètre part de 6:00 et descend. Quand il atteint zéro, l\'équipe qui mène gagne.',
        },
        {
            title: 'Chaque but ajoute 30 secondes',
            detail: 'Le bonus vaut pour les deux équipes, quel que soit le marqueur. Un match animé dure plus longtemps qu\'un match fermé.',
        },
        {
            title: 'Égalité à zéro : but en or',
            detail: 'Le chronomètre s\'arrête et le prochain but termine la partie, quel qu\'il soit.',
        },
        {
            title: 'Ne compte pas au classement',
            detail: 'Une partie en Chrono ne fait bouger ni ton ELO ni tes statistiques générales. Elle compte en revanche pour les packs.',
        },
    ],
};

export const BLITZ_MODE: GameMode = {
    id: 'blitz',
    name: 'Chrono Blitz',
    description: 'Deux minutes. Marquer est la seule façon d\'acheter du temps.',
    rewards: true,
    // Packs inclus depuis le 23/08. C'est le mode le plus court — deux minutes
    // — donc le plus rapide à enchaîner ; mais deux minutes restent deux
    // minutes, et le mode n'existe que pour être joué.
    countsInStats: true,
    ladder: 'blitz',
    timing: {
        baseSeconds: 2 * 60,
        bonusPerGoal: 20,
        // Le but en or casserait le rythme : ici on rejoue une manche courte.
        tieBreak: 'extra-time',
        extraSeconds: 20,
    },
    rules: [],
    explained: [
        {
            title: 'Deux minutes au départ',
            detail: 'Le chronomètre part de 2:00. Une équipe qui ne marque pas voit le match lui filer entre les doigts.',
        },
        {
            title: 'Chaque but ajoute 20 secondes',
            detail: 'C\'est le seul moyen de prolonger la partie. Marquer, c\'est acheter du temps.',
        },
        {
            title: 'Égalité à zéro : 20 secondes de plus',
            detail: 'On rejoue 20 secondes, autant de fois qu\'il le faut, jusqu\'à ce qu\'une équipe mène au coup de sifflet.',
        },
        {
            title: 'Pas de bonus en prolongation',
            detail: 'Pendant une prolongation, les buts ne rallongent plus le chronomètre. Sans cette règle, une égalité pourrait durer indéfiniment.',
        },
        {
            title: 'Son propre classement',
            detail: 'Le Blitz a son classement à part, indépendant du classement général. Le classement de référence reste celui du mode Normal.',
        },
        {
            title: 'Compte pour les packs',
            detail: 'Une partie en Blitz compte dans tes statistiques et rapporte des packs comme une partie normale. Seul le classement général reste à part.',
        },
    ],
};

export const MODES: GameMode[] = [NORMAL_MODE, BIBITIF_MODE, CHRONO_MODE, BLITZ_MODE];

export function getMode(modeId: string | undefined | null): GameMode {
    if (!modeId) return NORMAL_MODE;
    return MODES.find(m => m.id === modeId) ?? NORMAL_MODE;
}

export function isNormalMode(modeId: string | undefined | null): boolean {
    return getMode(modeId).id === NORMAL_MODE.id;
}
