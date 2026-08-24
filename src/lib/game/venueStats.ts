/**
 * STATISTIQUES PAR STADE — chantier 9.36.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le classement filtré par stade recalculait tout à chaque affichage : il
 * lisait TOUTES les parties terminées du stade pour les agréger côté client.
 * Mesuré le 22/08 sur la production : **1 055 Ko** pour le stade le plus
 * fréquenté (310 parties).
 *
 * Idée de Sacha : « c'est un peu con, on peut juste enregistrer le nombre de
 * parties jouées à ce stade ». Exactement — un compteur tenu à jour à la fin
 * de chaque partie remplace une agrégation refaite mille fois.
 *
 * Les compteurs vivent sur le profil du joueur, dans `stats.venues`. Il y a
 * sept stades : la carte reste minuscule, et le classement par stade se lit
 * alors avec la MÊME requête que le classement général.
 *
 * Module pur : le calcul doit être vérifiable sans Firebase, et il tourne
 * côté serveur.
 */

/** Compteurs d'un joueur pour un stade donné. */
export interface VenueCounters {
    games: number;
    wins: number;
    goalsScored: number;
}

export type VenueStats = Record<string, VenueCounters>;

/** Un identifiant de stade exploitable ? */
export function isRealVenue(venueId: string | undefined | null): boolean {
    // `none` n'est pas un stade : cinq parties de production le portent, et le
    // document correspondant n'existe pas.
    if (!venueId || venueId === 'none') return false;
    // Un point casserait les chemins de champ Firestore.
    return !venueId.includes('.') && !venueId.includes('/');
}

/**
 * Ajoute une partie aux compteurs d'un stade.
 *
 * Renvoie une NOUVELLE carte : l'appelant écrit le résultat, il ne mute rien.
 * Un stade inconnu ou absent laisse les compteurs intacts.
 */
export function accumulateVenue(
    venues: VenueStats | undefined,
    venueId: string | undefined | null,
    result: { won: boolean; goalsScored: number },
): VenueStats {
    const base = venues ?? {};
    if (!isRealVenue(venueId)) return base;

    const id = venueId as string;
    const courant = base[id] ?? { games: 0, wins: 0, goalsScored: 0 };

    return {
        ...base,
        [id]: {
            games: courant.games + 1,
            wins: courant.wins + (result.won ? 1 : 0),
            goalsScored: courant.goalsScored + Math.max(0, result.goalsScored),
        },
    };
}

/** Compteurs d'un joueur pour un stade, zéro s'il n'y a jamais joué. */
export function countersFor(venues: VenueStats | undefined, venueId: string): VenueCounters {
    return venues?.[venueId] ?? { games: 0, wins: 0, goalsScored: 0 };
}

/** Taux de victoire, sans jamais diviser par zéro. */
export function winRateOf(counters: VenueCounters): number {
    return counters.games > 0 ? counters.wins / counters.games : 0;
}
