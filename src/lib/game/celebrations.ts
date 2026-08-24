/**
 * CE QU'IL Y A À CÉLÉBRER À LA FIN D'UNE PARTIE — calcul pur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * L'app fêtait déjà la victoire (feux d'artifice) et la défaite (fumée). Mais
 * les moments qui donnent VRAIMENT envie de rejouer passaient inaperçus :
 * franchir un palier de grade, battre son record, enchaîner les victoires.
 *
 * Ce sont pourtant les données les plus faciles à obtenir : le grade se déduit
 * de l'ELO (`rankUtils`), et l'ELO d'avant et d'après sont déjà stockés sur la
 * partie (`game.eloChanges`). Rien à calculer côté serveur, rien à migrer.
 *
 * Module pur : il prend des nombres et rend une liste de choses à annoncer.
 * Il ne sait pas comment elles seront affichées — c'est ce qui permettra de
 * les montrer ailleurs qu'à l'écran de résultats sans le réécrire.
 */

import { getRankInfo, type RankType } from '@/lib/utils/rankUtils';
import type { SoundName } from '@/hooks/useSound';

/** Sévérité d'affichage : dicte l'ordre et l'emphase, pas le style. */
export type CelebrationTier = 'majeur' | 'notable' | 'discret';

export type CelebrationKind =
    | 'grade_up'
    | 'grade_down'
    | 'record'
    | 'mvp'
    | 'streak';

export interface Celebration {
    kind: CelebrationKind;
    tier: CelebrationTier;
    title: string;
    detail: string;
    /** Chemin de l'animation à jouer, pour les célébrations majeures seulement. */
    animation?: string;
    /**
     * Son à jouer, s'il en existe un pertinent.
     * Typé sur les sons réellement chargés : une célébration ne peut pas
     * référencer un fichier qui n'existe pas.
     */
    sound?: SoundName;
}

export interface CelebrationInput {
    previousElo: number;
    newElo: number;
    /** Le joueur a-t-il battu son record d'ELO sur cette partie ? */
    isRecord?: boolean;
    isMVP?: boolean;
    /** Victoires consécutives APRÈS cette partie. */
    winStreak?: number;
}

/** Le grade a-t-il changé de famille ou de palier entre deux ELO ? */
function rankKey(elo: number): string {
    const r = getRankInfo(elo);
    return `${r.rank}-${r.level}`;
}

/** Ordre des familles, pour savoir si on monte ou si on descend. */
const RANK_ORDER: RankType[] = ['argent', 'or', 'diamant', 'master', 'grandmaster'];

function rankValue(elo: number): number {
    const r = getRankInfo(elo);
    // Niveau III est le plus bas d'une famille, I le plus haut : on inverse.
    return RANK_ORDER.indexOf(r.rank) * 10 + (4 - r.level);
}

/**
 * Seuil à partir duquel une série mérite d'être signalée.
 * ⚠️ PROVISOIRE — valeur à calibrer avec l'équipe. En dessous de 3, ça
 * arriverait presque à chaque soirée et perdrait tout sens.
 */
export const STREAK_THRESHOLD = 3;

export function computeCelebrations(input: CelebrationInput): Celebration[] {
    const { previousElo, newElo, isRecord, isMVP, winStreak } = input;
    const celebrations: Celebration[] = [];

    // ─── Changement de grade ─────────────────────────────────────────────────
    if (rankKey(previousElo) !== rankKey(newElo)) {
        const after = getRankInfo(newElo);
        const monte = rankValue(newElo) > rankValue(previousElo);

        celebrations.push(monte
            ? {
                kind: 'grade_up',
                tier: 'majeur',
                title: 'Nouveau grade',
                detail: `${after.label} ${after.romanLevel}`,
                animation: '/animations/fireworks.json',
                sound: 'victory',
            }
            : {
                kind: 'grade_down',
                tier: 'notable',
                // Une rétrogradation n'est pas une célébration, mais elle doit
                // être annoncée : la découvrir plus tard, par hasard, est pire.
                title: 'Grade perdu',
                detail: `Retour en ${after.label} ${after.romanLevel}`,
            });
    }

    // ─── Record personnel ────────────────────────────────────────────────────
    if (isRecord) {
        celebrations.push({
            kind: 'record',
            tier: 'majeur',
            title: 'Record battu',
            detail: `${newElo} Elo, ton meilleur score`,
            animation: '/animations/fireworks.json',
            sound: 'victory',
        });
    }

    // ─── Série de victoires ──────────────────────────────────────────────────
    if (winStreak !== undefined && winStreak >= STREAK_THRESHOLD) {
        celebrations.push({
            kind: 'streak',
            tier: 'notable',
            title: 'En feu',
            detail: `${winStreak} victoires d'affilée`,
        });
    }

    // ─── MVP ─────────────────────────────────────────────────────────────────
    if (isMVP) {
        celebrations.push({
            kind: 'mvp',
            tier: 'discret',
            title: 'MVP',
            detail: 'Meilleur joueur de la partie',
        });
    }

    // Les plus fortes d'abord : sur un écran, l'ordre EST la hiérarchie.
    const order: Record<CelebrationTier, number> = { majeur: 0, notable: 1, discret: 2 };
    return celebrations.sort((a, b) => order[a.tier] - order[b.tier]);
}

/**
 * L'animation plein écran à jouer, s'il y en a une.
 *
 * Une seule, jamais deux : deux animations plein écran superposées, c'est du
 * bruit. On prend celle de la célébration la plus forte.
 */
export function pickAnimation(celebrations: Celebration[]): string | null {
    return celebrations.find(c => c.animation)?.animation ?? null;
}
