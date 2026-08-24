/**
 * COMBIEN DE PACKS CE JOUEUR A-T-IL GAGNÉS ?
 *
 * Décision de Sacha (21/08) : **un pack toutes les 10 parties jouées**. Pas de
 * tirage au sort, donc pas de malchance à compenser.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DÉRIVATION, PAS INCRÉMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * On ne compte pas « +1 pack tous les 10 matchs ». On DÉDUIT le total dû du
 * nombre de parties jouées, puis on octroie la différence avec ce qui a déjà
 * été donné.
 *
 * C'est idempotent par construction et ça se répare tout seul : une partie
 * manquée, une route rejouée, un recalcul de statistiques — le compte se remet
 * d'aplomb au match suivant. Un compteur incrémenté, lui, dérive et ne se
 * rattrape jamais.
 *
 * Module pur : le calcul doit être vérifiable sans Firebase, et il tourne
 * exclusivement côté serveur.
 */

/**
 * ⚠️ PROVISOIRE — à calibrer. Vivra en config serveur (bloc 4).
 *
 * Passé de 10 à 5 le 24/08, décision de Sacha, sur les chiffres suivants : la
 * médiane des joueurs est de **5 parties qualifiantes**. À un pack pour dix, le
 * joueur médian n'en voyait donc JAMAIS.
 *
 * | | 1 pack / 10 | 1 pack / 5 |
 * |---|---|---|
 * | joueurs ayant au moins 1 pack | 40 (35 %) | **61 (54 %)** |
 *
 * C'est ce qui fait basculer la moitié des joueurs de « n'a jamais vu un pack »
 * à « en a ouvert un ». La garantie anti-malchance, elle, ne pouvait rien pour
 * eux : elle n'aide que ceux qui ouvrent déjà beaucoup.
 *
 * Changé sans risque : `packGames` était à zéro sur les 141 profils, personne
 * n'avait encore gagné le moindre pack.
 */
export const PARTIES_PAR_PACK = 5;

/**
 * La question du rétroactif ne se pose plus.
 *
 * Les packs se comptent sur `stats.packGames`, un compteur NEUF qui vaut zéro
 * pour tout le monde — et qui ne compte que les parties sérieuses (voir
 * `gameCountsForPacks`). Les 2 382 parties de l'historique n'entrent donc pas
 * dans le calcul, sans qu'on ait besoin d'un réglage pour ça.
 *
 * Reste `true` parce que le repère doit valoir ZÉRO : partir de la valeur
 * courante de `packGames` ferait perdre au joueur la partie en cours.
 */
export const OCTROI_RETROACTIF = true;

/**
 * ⚠️ PROVISOIRE — buts minimum du gagnant pour qu'une partie compte.
 *
 * Demande de Sacha (21/08) : « des parties qui se font au moins jusqu'à six
 * buts pour le gagnant, sinon on ne les compte pas ». C'est une protection
 * simple contre le farm : enchaîner des 1-0 en dix secondes ne doit pas
 * distribuer des packs.
 *
 * Bien plus efficace que de durcir les règles Firestore, et sans rien casser :
 * une partie non qualifiante compte toujours dans les statistiques et l'ELO,
 * elle ne rapporte simplement pas de pack.
 */
export const BUTS_MINIMUM_GAGNANT = 6;

export interface GameQualification {
    /** Score de l'équipe gagnante. */
    winnerScore: number;
    /** La partie comptait-elle au moins un invité ? */
    hasGuests: boolean;
    /**
     * Le mode est-il au chronomètre ?
     *
     * Le seuil de buts n'a aucun sens en Chrono ou en Blitz : une partie s'y
     * termine souvent à 3-2, et exiger 6 buts les priverait presque toujours
     * de pack. C'est la DURÉE qui protège du farm — on ne finit pas un blitz
     * de deux minutes en moins de deux minutes.
     */
    timed?: boolean;
}

/**
 * Cette partie compte-t-elle pour les packs ?
 *
 * Deux conditions, toutes deux nécessaires :
 *   - **aucun invité.** Un invité n'a pas de compte : une partie contre des
 *     invités inventés de toutes pièces se fabrique en trois clics. C'est déjà
 *     la règle pour l'ELO (`hasGuestPlayers` dans `lib/game/scoring.ts`) ;
 *   - **le gagnant a atteint le seuil de buts.** Une partie écourtée ne
 *     compte pas.
 */
export function gameCountsForPacks(
    game: GameQualification,
    minButs: number = BUTS_MINIMUM_GAGNANT,
): boolean {
    if (game.hasGuests) return false;
    if (game.timed) return true;
    return game.winnerScore >= minButs;
}

export interface PackState {
    /** Packs déjà octroyés depuis le repère. */
    granted?: number;
    /**
     * Parties jouées au moment où le système a été activé pour ce joueur.
     *
     * Ce repère est indispensable : sans lui, on déduirait le dû du total
     * absolu, et un joueur à 259 parties toucherait un pack à la partie
     * SUIVANTE quand un joueur à 250 devrait en attendre dix. Le repère met
     * tout le monde sur la même ligne de départ.
     */
    baseline?: number;
}

export interface PackEarning {
    /** Total de packs dus depuis le repère. */
    due: number;
    /** Combien il faut en créer maintenant. */
    toGrant: number;
    /** Nouvelle valeur de `packsGranted` à écrire sur le profil. */
    newPacksGranted: number;
    /** Repère à écrire sur le profil (inchangé une fois posé). */
    baseline: number;
}

/**
 * @param totalGames parties jouées, après la partie qui vient de finir
 * @param state      ce que le profil mémorise déjà
 */
export function computePackEarning(
    totalGames: number,
    state: PackState = {},
    opts: { perPack?: number; retroactif?: boolean } = {},
): PackEarning {
    const perPack = opts.perPack ?? PARTIES_PAR_PACK;
    const retroactif = opts.retroactif ?? OCTROI_RETROACTIF;
    const jouees = Math.max(0, totalGames);

    // Premier passage : on pose le repère. Sans rétroactif il vaut le total
    // actuel — l'historique ne compte pas, mais personne ne part avec un
    // palier déjà à moitié franchi.
    const baseline = state.baseline ?? (retroactif ? 0 : jouees);

    const depuisRepere = Math.max(0, jouees - baseline);
    const due = perPack > 0 ? Math.floor(depuisRepere / perPack) : 0;

    const deja = Math.max(0, state.granted ?? 0);
    // `max(0, …)` protège du cas où `granted` dépasse le dû : ça arrive si des
    // parties sont supprimées. On ne reprend jamais un pack déjà donné.
    const toGrant = Math.max(0, due - deja);

    return { due, toGrant, newPacksGranted: Math.max(deja, due), baseline };
}

/**
 * Identifiant d'un pack, DÉTERMINISTE.
 *
 * `pack_7` est le septième pack de ce joueur, pour toujours. Créer deux fois
 * le même document est sans effet : c'est ce qui rend l'octroi rejouable sans
 * précaution particulière, même si la route de fin de partie est appelée deux
 * fois pour la même partie.
 */
export function packInstanceId(index: number): string {
    return `pack_${index}`;
}

/** Les identifiants à créer pour cet octroi. */
export function packIdsToCreate(earning: PackEarning): string[] {
    const ids: string[] = [];
    for (let i = earning.newPacksGranted - earning.toGrant + 1; i <= earning.newPacksGranted; i++) {
        ids.push(packInstanceId(i));
    }
    return ids;
}
