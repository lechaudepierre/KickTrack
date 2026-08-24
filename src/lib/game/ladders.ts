/**
 * LES CLASSEMENTS — chantier 7.11.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE NOTION GÉNÉRIQUE, ET PAS UN CHAMP `blitzElo`
 * ═══════════════════════════════════════════════════════════════════════════
 * Ajouter `blitzElo` à côté de `elo` marche une fois. Au troisième classement,
 * il y a trois ELO, trois pics, trois historiques à tenir en accord dans une
 * dizaine de fichiers — et le jour où l'un diverge, personne ne s'en aperçoit.
 *
 * Ici, un classement est une ENTRÉE DE REGISTRE, et les statistiques d'un
 * joueur sont indexées par son identifiant. Un quatrième classement, c'est
 * cinq lignes de données.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AUCUNE MIGRATION, ET C'EST LE POINT IMPORTANT
 * ═══════════════════════════════════════════════════════════════════════════
 * Le classement PRINCIPAL **est** les champs historiques : `stats.elo`,
 * `peakElo`, `totalGames`, `wins`, `eloHistory`. On ne les recopie pas dans
 * `stats.ladders.normal`.
 *
 * J'avais écrit cette migration avant de mesurer ce qu'elle coûtait :
 * `eloHistory` monte à 192 entrées sur les gros joueurs, et la dupliquer
 * aurait **doublé le poids des profils** — juste après le travail fait pour
 * les alléger (le classement en lit 141 d'un coup).
 *
 * Donc : `stats.ladders` ne contient QUE les classements secondaires. Le
 * principal reste là où il a toujours été, lu par `RankAvatar`, `getRankInfo`,
 * le profil et la page de résultats sans qu'aucun ne change d'une ligne.
 *
 * Bénéfice inattendu : il n'y a **rien à migrer**. Pas de script, pas de
 * fenêtre de bascule, pas de retour en arrière à préparer.
 *
 * Module pur : ni React, ni Firebase.
 */

export type LadderId = 'normal' | 'blitz';

export interface LadderConfig {
    id: LadderId;
    label: string;
    /** Le classement de référence, celui dont on parle quand on dit « le » classement. */
    primary: boolean;
    description: string;
}

export const LADDERS: Record<LadderId, LadderConfig> = {
    normal: {
        id: 'normal',
        label: 'Général',
        primary: true,
        description: 'Le classement de référence, alimenté par les parties en mode Normal.',
    },
    blitz: {
        id: 'blitz',
        label: 'Blitz',
        primary: false,
        description: 'Classement à part, alimenté uniquement par les parties en Chrono Blitz.',
    },
};

/** Les classements dans l'ordre d'affichage : le principal d'abord. */
export function orderedLadders(): LadderConfig[] {
    return Object.values(LADDERS).sort((a, b) => Number(b.primary) - Number(a.primary));
}

export function isLadderId(value: unknown): value is LadderId {
    return value === 'normal' || value === 'blitz';
}

/** ELO de départ, commun à tous les classements. */
export const ELO_BASE = 1000;

export interface LadderStats {
    elo: number;
    peakElo: number;
    /** Parties jouées SUR CETTE ÉCHELLE. */
    games: number;
    wins: number;
}

/** La forme minimale de `stats` dont ce module a besoin. */
/**
 * Chemin du champ à interroger pour l'ELO d'un classement.
 * Sert aux requêtes Firestore, qui ne connaissent que des chemins.
 */
export function eloFieldPath(ladder: LadderId): string {
    return LADDERS[ladder].primary ? 'stats.elo' : `stats.ladders.${ladder}.elo`;
}

/** Chemin du champ à interroger pour le nombre de parties d'un classement. */
export function gamesFieldPath(ladder: LadderId): string {
    return LADDERS[ladder].primary ? 'stats.totalGames' : `stats.ladders.${ladder}.games`;
}

export interface StatsLike {
    elo?: number;
    peakElo?: number;
    totalGames?: number;
    wins?: number;
    ladders?: Partial<Record<LadderId, Partial<LadderStats>>>;
}

/**
 * Statistiques d'un joueur sur un classement.
 *
 * Pour `normal`, retombe sur les champs historiques quand `ladders` n'existe
 * pas encore — c'est ce qui rend la migration non bloquante.
 */
export function readLadder(stats: StatsLike | undefined, ladder: LadderId): LadderStats {
    // Le classement principal EST le jeu de champs historiques. Aucune copie,
    // donc aucune migration et aucun risque de divergence entre deux sources.
    if (LADDERS[ladder].primary) {
        const elo = stats?.elo ?? ELO_BASE;
        return {
            elo,
            peakElo: Math.max(stats?.peakElo ?? elo, elo),
            games: stats?.totalGames ?? 0,
            wins: stats?.wins ?? 0,
        };
    }

    const brut = stats?.ladders?.[ladder];
    if (brut) {
        return {
            elo: brut.elo ?? ELO_BASE,
            peakElo: Math.max(brut.peakElo ?? brut.elo ?? ELO_BASE, brut.elo ?? ELO_BASE),
            games: brut.games ?? 0,
            wins: brut.wins ?? 0,
        };
    }

    // Un classement jamais joué : zéro partie, et c'est ce qui l'exclut de
    // l'affichage. Sacha, 22/08 : « un joueur qui n'a jamais joué en Blitz, il
    // n'apparaît juste pas ». Un classement où tout le monde est à 1000
    // n'apprendrait rien.
    return { elo: ELO_BASE, peakElo: ELO_BASE, games: 0, wins: 0 };
}

/** Le joueur figure-t-il dans ce classement ? */
export function appearsInLadder(stats: StatsLike | undefined, ladder: LadderId): boolean {
    return readLadder(stats, ladder).games > 0;
}

/**
 * Applique le résultat d'une partie à un classement.
 *
 * Renvoie de NOUVELLES statistiques : rien n'est muté, et le pic ne redescend
 * jamais.
 *
 * Aucun historique ici — voir D7 : `stats.eloHistory` a été supprimé le 22/08.
 * Il pesait 43 % des profils que le classement télécharge, et personne ne le
 * lisait : le graphique du profil est recalculé depuis les parties, et le pic
 * tient dans un seul nombre.
 */
export function applyGameToLadder(
    courant: LadderStats,
    result: { eloChange: number; won: boolean },
): LadderStats {
    const elo = courant.elo + result.eloChange;
    return {
        elo,
        peakElo: Math.max(courant.peakElo, elo),
        games: courant.games + 1,
        wins: courant.wins + (result.won ? 1 : 0),
    };
}
