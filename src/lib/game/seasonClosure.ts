/**
 * LA CLÔTURE D'UNE SAISON — ce qui revient à qui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUT SE DÉCIDE ICI, ET RIEN N'EST ÉCRIT
 * ═══════════════════════════════════════════════════════════════════════════
 * Ce module transforme un classement final et un fichier de configuration en
 * un PLAN : pour chaque joueur, ce qu'il reçoit et quel sera son nouvel ELO.
 *
 * Il n'écrit rien, ne lit rien, ne connaît ni Firebase ni le réseau. C'est
 * délibéré : une clôture ne se produit qu'une fois, sur 141 comptes, et une
 * erreur y est très coûteuse à réparer. Tout ce qui peut être vérifié AVANT de
 * toucher à la base doit l'être ici, par des tests.
 *
 * Le script d'exécution se contente d'appliquer ce plan.
 */

import { applyEloReset, type EloResetConfig } from './seasonReset';
import type { RankType } from '@/lib/utils/rankUtils';

/** Ordre des grades, du plus accessible au plus élevé. */
export const ORDRE_GRADES: RankType[] = ['argent', 'or', 'diamant', 'master', 'grandmaster'];

export interface RecompensesConfig {
    /** Items donnés à tout joueur ayant joué au moins une partie. */
    participation: string[];
    /** Items par grade atteint. */
    parGrade: Partial<Record<RankType, string[]>>;
    /**
     * On reçoit AUSSI les items des grades inférieurs au sien.
     *
     * Décision de Sacha (22/08) : « tout ce qui est items des rangs en dessous
     * du rang que j'ai obtenu, je les débloque aussi ». Un joueur Master
     * repart donc avec Argent, Or, Diamant et Master — mais pas Grand Master.
     */
    grades_cumulatifs: boolean;
    /** Items par place finale, bornes incluses. */
    parPlace: Array<{ min: number; max: number; items: string[] }>;
}

export interface SeasonCloseConfig {
    /** Saison qui se termine. */
    from: { id: string; label: string };
    /** Saison qui commence. */
    to: { id: string; label: string };
    elo: EloResetConfig;
    placementGames: number;
    recompenses: RecompensesConfig;
}

/** Une ligne du classement final. */
export interface FinalStanding {
    userId: string;
    username: string;
    /** Place finale, 1 = premier. */
    rank: number;
    /** ELO à la clôture. */
    elo: number;
    /** Meilleur grade ATTEINT pendant la saison, pas celui de fin. */
    peakGrade: RankType;
    /** Parties classées jouées dans la saison. */
    games: number;
}

/** Ce qui sera écrit pour un joueur. */
export interface PlayerClosurePlan {
    userId: string;
    username: string;
    rank: number;
    /** Items à octroyer, dédoublonnés et triés. */
    items: string[];
    eloBefore: number;
    eloAfter: number;
    peakGrade: RankType;
    games: number;
}

/**
 * Les items dus à un joueur.
 *
 * Trois sources qui s'additionnent : la participation, le grade (et ceux du
 * dessous si le cumul est activé), et la place finale.
 */
export function itemsFor(standing: FinalStanding, config: SeasonCloseConfig): string[] {
    const items = new Set<string>();

    if (standing.games > 0) {
        for (const id of config.recompenses.participation) items.add(id);
    }

    const rang = ORDRE_GRADES.indexOf(standing.peakGrade);
    if (rang >= 0) {
        const grades = config.recompenses.grades_cumulatifs
            ? ORDRE_GRADES.slice(0, rang + 1)
            : [standing.peakGrade];
        for (const g of grades) {
            for (const id of config.recompenses.parGrade[g] ?? []) items.add(id);
        }
    }

    for (const tranche of config.recompenses.parPlace) {
        if (standing.rank >= tranche.min && standing.rank <= tranche.max) {
            for (const id of tranche.items) items.add(id);
        }
    }

    return [...items].sort();
}

/** Le plan complet, un joueur par ligne, dans l'ordre du classement. */
export function buildClosurePlan(
    standings: FinalStanding[],
    config: SeasonCloseConfig,
): PlayerClosurePlan[] {
    return [...standings]
        .sort((a, b) => a.rank - b.rank)
        .map(s => ({
            userId: s.userId,
            username: s.username,
            rank: s.rank,
            items: itemsFor(s, config),
            eloBefore: s.elo,
            eloAfter: applyEloReset(s.elo, config.elo),
            peakGrade: s.peakGrade,
            games: s.games,
        }));
}

/** Tous les identifiants d'items que la configuration peut distribuer. */
export function allConfiguredItems(config: SeasonCloseConfig): string[] {
    const items = new Set<string>(config.recompenses.participation);
    for (const liste of Object.values(config.recompenses.parGrade)) {
        for (const id of liste ?? []) items.add(id);
    }
    for (const t of config.recompenses.parPlace) {
        for (const id of t.items) items.add(id);
    }
    return [...items].sort();
}

/**
 * Vérifie la configuration AVANT toute écriture.
 *
 * Une clôture qui s'arrête au milieu laisse la moitié des joueurs récompensés
 * et l'autre non — c'est le pire état possible. Mieux vaut refuser de démarrer.
 */
export function validateConfig(
    config: SeasonCloseConfig,
    catalogIds: string[],
): string[] {
    const erreurs: string[] = [];
    const connus = new Set(catalogIds);

    for (const id of allConfiguredItems(config)) {
        if (!connus.has(id)) erreurs.push(`Item absent du catalogue : « ${id} »`);
    }
    if (config.from.id === config.to.id) {
        erreurs.push('La saison qui se termine et celle qui commence portent le même identifiant.');
    }
    if (config.placementGames < 0) {
        erreurs.push('Le nombre de parties de placement ne peut pas être négatif.');
    }
    for (const t of config.recompenses.parPlace) {
        if (t.min > t.max) erreurs.push(`Tranche de places incohérente : ${t.min} à ${t.max}.`);
        if (t.min < 1) erreurs.push(`Une place commence à 1, pas à ${t.min}.`);
    }
    return erreurs;
}

/** Résumé chiffré du plan, pour le contrôle à blanc. */
export function summarize(plan: PlayerClosurePlan[]) {
    const octrois = plan.reduce((n, p) => n + p.items.length, 0);
    const parItem = new Map<string, number>();
    for (const p of plan) {
        for (const id of p.items) parItem.set(id, (parItem.get(id) ?? 0) + 1);
    }
    return {
        joueurs: plan.length,
        octrois,
        sansRecompense: plan.filter(p => p.items.length === 0).length,
        parItem: [...parItem.entries()].sort((a, b) => b[1] - a[1]),
    };
}
