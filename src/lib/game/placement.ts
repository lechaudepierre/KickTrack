/**
 * PARTIES DE PLACEMENT — chantier 3.10f.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE ÇA RÉSOUT
 * ═══════════════════════════════════════════════════════════════════════════
 * Après une compression d'ELO, personne n'est à sa vraie place. Sans
 * placement, il faut une vingtaine de parties pour que le classement redevienne
 * juste — et pendant ce temps il ne veut plus rien dire.
 *
 * Pendant le placement :
 *   - l'ELO bouge DEUX FOIS plus fort, pour trouver son niveau vite ;
 *   - la place au classement est remplacée par « 1 / 3 » ;
 *   - l'ELO n'est pas affiché : il n'est pas encore significatif.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MAIS ON RESTE VISIBLE — décision de Sacha, 22/08
 * ═══════════════════════════════════════════════════════════════════════════
 * Masquer tout le monde tant que le placement n'est pas fini donnerait un
 * classement quasi vide le jour du lancement. On aurait l'impression que tout
 * le monde est parti, au pire moment possible.
 *
 * Donc : un joueur qui a joué la saison PRÉCÉDENTE reste au classement dès le
 * premier jour, avec « 0 / 3 » à la place de son rang. Un joueur qui n'a
 * jamais joué n'apparaît pas — c'est déjà la règle du Blitz.
 *
 * Module pur : ni React, ni Firebase.
 */

/** ⚠️ PROVISOIRE — tranché à 3 par Sacha, à confirmer une fois vu tourner. */
export const PARTIES_DE_PLACEMENT = 3;

/** L'ELO bouge deux fois plus fort pendant le placement. */
export const MULTIPLICATEUR_PLACEMENT = 2;

export interface PlacementState {
    /** Parties CLASSÉES jouées dans la saison en cours. */
    seasonGames: number;
    /** Le joueur figurait-il au classement de la saison précédente ? */
    playedPreviousSeason: boolean;
}

/** Le joueur est-il encore en placement ? */
export function isInPlacement(state: PlacementState, requises = PARTIES_DE_PLACEMENT): boolean {
    return Math.max(0, state.seasonGames) < requises;
}

export interface PlacementProgress {
    done: number;
    required: number;
    remaining: number;
    /** « 1 / 3 », à afficher à la place du rang. */
    label: string;
}

export function placementProgress(
    state: PlacementState,
    requises = PARTIES_DE_PLACEMENT,
): PlacementProgress {
    const done = Math.min(Math.max(0, state.seasonGames), requises);
    return {
        done,
        required: requises,
        remaining: requises - done,
        label: `${done} / ${requises}`,
    };
}

/**
 * Coefficient à appliquer au changement d'ELO.
 *
 * Renvoie un NOMBRE et non un booléen : le jour où on voudra un placement plus
 * progressif (×3 puis ×2 puis ×1), c'est cette fonction qui change, et rien
 * d'autre.
 */
export function eloMultiplier(state: PlacementState, requises = PARTIES_DE_PLACEMENT): number {
    return isInPlacement(state, requises) ? MULTIPLICATEUR_PLACEMENT : 1;
}

/**
 * Le joueur apparaît-il au classement ?
 *
 * Trois cas :
 *   - placement terminé            -> oui, normalement ;
 *   - en placement mais ancien     -> OUI, avec « 0 / 3 » ;
 *   - en placement et jamais joué  -> non.
 */
export function appearsInLeaderboard(
    state: PlacementState,
    requises = PARTIES_DE_PLACEMENT,
): boolean {
    if (!isInPlacement(state, requises)) return state.seasonGames > 0 || state.playedPreviousSeason;
    return state.playedPreviousSeason;
}

/**
 * L'ELO à afficher, ou `null` s'il doit rester masqué.
 *
 * Pendant le placement, l'ELO existe et bouge — mais il ne veut encore rien
 * dire. L'afficher inviterait à le comparer, ce qui est exactement ce qu'on
 * cherche à éviter.
 */
export function displayElo(
    elo: number,
    state: PlacementState,
    requises = PARTIES_DE_PLACEMENT,
): number | null {
    return isInPlacement(state, requises) ? null : elo;
}
