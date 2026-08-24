/**
 * ÉVOLUTION AU CLASSEMENT — calcul pur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * D'OÙ VIENT LA DONNÉE
 * ═══════════════════════════════════════════════════════════════════════════
 * Aucun historique de CLASSEMENT n'est stocké, et il n'y en a pas besoin :
 * `stats.history` conserve déjà, pour chaque jour joué, l'ELO de fin de
 * journée. On reconstitue donc le classement d'il y a une semaine en triant
 * les joueurs sur leur ELO d'alors, et on compare les positions.
 *
 * Même approche que `resolvePeakElo` : la donnée existait, il suffisait de
 * la lire. Aucune migration, et ça fonctionne rétroactivement sur les 147
 * comptes existants.
 *
 * ⚠️ Un joueur qui n'a pas joué depuis plus d'une semaine n'a pas d'entrée
 *    dans la fenêtre : on prend alors la dernière entrée ANTÉRIEURE, qui est
 *    bien son ELO d'il y a une semaine. S'il n'a aucun historique du tout,
 *    il est déclaré « nouveau » plutôt que « stable » — dire qu'il n'a pas
 *    bougé serait faux.
 */

export interface DailyEloEntry {
    date: string;
    elo?: number;
}

export interface RankedPlayer {
    userId: string;
    elo?: number;
    history?: Record<string, DailyEloEntry>;
}

export type Movement =
    | { kind: 'up'; places: number }
    | { kind: 'down'; places: number }
    | { kind: 'same' }
    | { kind: 'new' };

/** Nombre de jours sur lesquels on mesure l'évolution. */
export const MOVEMENT_WINDOW_DAYS = 7;

/**
 * ELO d'un joueur à une date donnée : la dernière entrée d'historique
 * antérieure ou égale à cette date.
 *
 * Retourne `null` si le joueur n'avait aucune entrée à ce moment-là — il
 * n'était pas encore classé.
 */
export function eloAsOf(player: RankedPlayer, isoDate: string): number | null {
    const entries = Object.values(player.history ?? {})
        .filter(e => e?.date && typeof e.elo === 'number' && e.date <= isoDate)
        .sort((a, b) => a.date.localeCompare(b.date));

    return entries.length > 0 ? entries[entries.length - 1].elo! : null;
}

/**
 * Évolution de chaque joueur au classement sur la fenêtre écoulée.
 *
 * @param players classement ACTUEL, déjà trié du meilleur au moins bon
 * @param today   date du jour au format YYYY-MM-DD, injectée pour rester pur
 * @returns map userId -> évolution
 */
export function computeMovements(
    players: RankedPlayer[],
    today: string,
    windowDays: number = MOVEMENT_WINDOW_DAYS
): Record<string, Movement> {
    const cutoff = shiftDate(today, -windowDays);

    // Classement d'alors : mêmes joueurs, triés sur leur ELO à la date de coupe.
    const past = players
        .map(p => ({ userId: p.userId, elo: eloAsOf(p, cutoff) }))
        .filter((p): p is { userId: string; elo: number } => p.elo !== null)
        .sort((a, b) => b.elo - a.elo);

    const pastRank = new Map(past.map((p, i) => [p.userId, i + 1]));
    const movements: Record<string, Movement> = {};

    players.forEach((player, index) => {
        const before = pastRank.get(player.userId);
        const now = index + 1;

        if (before === undefined) {
            movements[player.userId] = { kind: 'new' };
        } else if (before === now) {
            movements[player.userId] = { kind: 'same' };
        } else if (before > now) {
            // Un rang plus petit est meilleur : passer de 12 à 5, c'est monter.
            movements[player.userId] = { kind: 'up', places: before - now };
        } else {
            movements[player.userId] = { kind: 'down', places: now - before };
        }
    });

    return movements;
}

/** Décale une date ISO (YYYY-MM-DD) d'un nombre de jours. */
export function shiftDate(isoDate: string, days: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}
