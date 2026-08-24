/**
 * CONFIGURATION DES RANGS (ELO)
 * 
 * Voici la structure actuelle des paliers. Vous pouvez copier ce bloc pour demander des changements.
 * 
 * ARGENT : 0 - 899
 *   - Argent III : < 700
 *   - Argent II  : 700 - 799
 *   - Argent I   : 800 - 899
 * 
 * OR : 900 - 1049
 *   - Or III : 900 - 949
 *   - Or II  : 950 - 999
 *   - Or I   : 1000 - 1049
 * 
 * DIAMANT : 1050 - 1199
 *   - Diamant III : 1050 - 1099
 *   - Diamant II  : 1100 - 1149
 *   - Diamant I   : 1150 - 1199
 * 
 * MASTER : 1200 - 1349
 *   - Master III : 1200 - 1249
 *   - Master II  : 1250 - 1299
 *   - Master I   : 1300 - 1349
 * 
 * GRANDMASTER : 1350+
 *   - GrandMaster III : 1350 - 1449
 *   - GrandMaster II  : 1450 - 1599
 *   - GrandMaster I   : 1600+
 */

export type RankType = 'argent' | 'or' | 'diamant' | 'master' | 'grandmaster';

export interface RankInfo {
    rank: RankType;
    label: string;
    level: 1 | 2 | 3;
    romanLevel: string;
    iconPath: string;
}

export const getRomanLevel = (level: number): string => {
    switch (level) {
        case 1: return 'I';
        case 2: return 'II';
        case 3: return 'III';
        default: return 'I';
    }
};

export const getRankInfo = (elo: number = 1000): RankInfo => {
    let rank: RankType = 'argent';
    let label: string = 'Argent';
    let level: 1 | 2 | 3 = 3;

    if (elo < 900) {
        rank = 'argent';
        label = 'Argent';
        if (elo < 700) level = 3;
        else if (elo < 800) level = 2;
        else level = 1;
    } else if (elo < 1050) {
        rank = 'or';
        label = 'Or';
        if (elo < 950) level = 3;
        else if (elo < 1000) level = 2;
        else level = 1;
    } else if (elo < 1200) {
        rank = 'diamant';
        label = 'Diamant';
        if (elo < 1100) level = 3;
        else if (elo < 1150) level = 2;
        else level = 1;
    } else if (elo < 1350) {
        rank = 'master';
        label = 'Master';
        if (elo < 1250) level = 3;
        else if (elo < 1300) level = 2;
        else level = 1;
    } else {
        rank = 'grandmaster';
        label = 'Grand Master';
        if (elo < 1450) level = 3;
        else if (elo < 1600) level = 2;
        else level = 1;
    }

    const rankFileNames: Record<RankType, string> = {
        argent: 'Silver',
        or: 'Gold',
        diamant: 'Diamond',
        master: 'Master',
        grandmaster: 'GrandMaster'
    };

    return {
        rank,
        label,
        level,
        romanLevel: getRomanLevel(level),
        iconPath: `/icons/ranks/${rankFileNames[rank]} ${level}.png`
    };
};

// ─── Progression vers le grade suivant ───────────────────────────────────────
//
// Les paliers ci-dessus existent depuis toujours et n'étaient affichés NULLE
// PART. Un joueur ne pouvait pas savoir ce qui le séparait du grade suivant —
// c'est pourtant l'information qui donne envie de rejouer une partie.

/** Bornes de chaque palier, dans l'ordre croissant. Dérivées des seuils ci-dessus. */
const RANK_THRESHOLDS: number[] = [
    0, 700, 800,          // Argent III, II, I
    900, 950, 1000,       // Or III, II, I
    1050, 1100, 1150,     // Diamant III, II, I
    1200, 1250, 1300,     // Master III, II, I
    1350, 1450, 1600,     // GrandMaster III, II, I
];

export interface RankProgress {
    /** Grade actuel. */
    current: RankInfo;
    /** Grade suivant, ou null si le joueur est au sommet. */
    next: RankInfo | null;
    /** ELO du seuil à atteindre, ou null au sommet. */
    nextThreshold: number | null;
    /** Points restants avant le palier suivant, ou null au sommet. */
    pointsToNext: number | null;
    /** Avancement dans le palier courant, entre 0 et 1. Vaut 1 au sommet. */
    ratio: number;
}

/**
 * Où en est un joueur dans son palier, et ce qui le sépare du suivant.
 *
 * Le dernier palier (GrandMaster I) n'a pas de suite : on renvoie alors un
 * avancement complet plutôt qu'une barre qui ne se remplirait jamais.
 */
export function getRankProgress(elo: number = 1000): RankProgress {
    const current = getRankInfo(elo);

    const floor = [...RANK_THRESHOLDS].reverse().find(t => elo >= t) ?? 0;
    const nextThreshold = RANK_THRESHOLDS.find(t => t > elo) ?? null;

    if (nextThreshold === null) {
        return { current, next: null, nextThreshold: null, pointsToNext: null, ratio: 1 };
    }

    const span = nextThreshold - floor;
    return {
        current,
        next: getRankInfo(nextThreshold),
        nextThreshold,
        pointsToNext: nextThreshold - elo,
        // `span` ne peut pas valoir 0 : les seuils sont strictement croissants.
        ratio: Math.min(1, Math.max(0, (elo - floor) / span)),
    };
}
