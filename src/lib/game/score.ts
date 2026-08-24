/**
 * LE SCORE D'UNE PARTIE — une seule source, un seul calcul.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE — chantier 9.1
 * ═══════════════════════════════════════════════════════════════════════════
 * Le score existe à DEUX endroits sur une partie :
 *   • `teams[0].score` et `teams[1].score` — lus par le serveur pour désigner
 *     le vainqueur, calculer le MVP, et déclencher les règles de mode ;
 *   • `game.score`, un tableau de deux entiers — lu par l'interface.
 *
 * Les deux étaient écrits séparément, à la main, dans TROIS fonctions
 * différentes : ajout de but, annulation, forfait. Chacune reconstruisait le
 * tableau avec sa propre expression ternaire.
 *
 * Tant que les trois sont justes, rien ne se voit. Mais le jour où un quatrième
 * chemin d'écriture apparaît — ou qu'une des trois est modifiée sans l'autre —
 * l'interface et le serveur ne sont plus d'accord sur qui a gagné. Et ça ne
 * lève aucune erreur : le match se termine simplement sur le mauvais résultat.
 *
 * Désormais `game.score` est DÉRIVÉ de `teams`, par cette fonction et par elle
 * seule. Il n'existe plus de chemin qui puisse mettre l'un à jour sans l'autre.
 *
 * Module pur : c'est le genre de calcul qu'on veut pouvoir vérifier sans
 * ouvrir une partie.
 */

/** La forme minimale d'une équipe pour ce module. */
export interface TeamScore {
    score: number;
}

/**
 * Le tableau `[score équipe 0, score équipe 1]`, dérivé des équipes.
 *
 * Un score absent ou absurde vaut zéro : mieux vaut afficher 0 qu'un `NaN` qui
 * se propagerait dans les comparaisons de vainqueur.
 */
export function scoreFromTeams(teams: readonly TeamScore[]): [number, number] {
    const lire = (i: number) => {
        const v = teams?.[i]?.score;
        return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    };
    return [lire(0), lire(1)];
}

/**
 * Les deux copies sont-elles d'accord ?
 *
 * Sert aux contrôles : une partie enregistrée avant cette correction peut
 * porter une divergence, et on veut pouvoir la repérer sans la deviner.
 */
export function scoresAgree(
    teams: readonly TeamScore[],
    score: readonly number[] | undefined,
): boolean {
    if (!score || score.length < 2) return false;
    const [a, b] = scoreFromTeams(teams);
    return score[0] === a && score[1] === b;
}

/** L'équipe gagnante, ou `null` en cas d'égalité. */
export function winnerFromTeams(teams: readonly TeamScore[]): 0 | 1 | null {
    const [a, b] = scoreFromTeams(teams);
    if (a === b) return null;
    return a > b ? 0 : 1;
}
