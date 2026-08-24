/**
 * REMISE À ZÉRO DE L'ELO ENTRE DEUX SAISONS — chantier 3.10e.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI COMPRESSER PLUTÔT QUE REMETTRE À PLAT
 * ═══════════════════════════════════════════════════════════════════════════
 * Tout remettre à 1000 efface six mois de progression : le meilleur joueur et
 * celui qui n'a jamais gagné repartent identiques, et plus personne ne se
 * reconnaît dans son classement.
 *
 * Ne rien toucher fait l'inverse : la saison 1 démarre avec des écarts déjà
 * creusés, et rattraper devient hors de portée.
 *
 * La compression garde l'ORDRE et divise les ÉCARTS. Tout le monde peut
 * redevenir premier, personne ne repart de rien.
 *
 *     nouvel ELO = 1000 + (ancien − 1000) × k        avec k = 0,5
 *
 *     1350 -> 1175      850 -> 925
 *
 * Module pur : une saison ne se clôture qu'une fois, et le calcul doit être
 * vérifiable AVANT de toucher à 141 profils.
 */

import { ELO_BASE } from './ladders';

/** Ce qu'on fait de l'ELO à la clôture. Vit dans le document de saison. */
export type EloResetMode = 'compress' | 'reset' | 'keep';

export interface EloResetConfig {
    mode: EloResetMode;
    /** Facteur de compression, pour `compress`. Tranché à 0,5 par Sacha. */
    k?: number;
}

/** Le réglage retenu pour la saison 0 -> 1. */
export const RESET_SAISON_1: EloResetConfig = { mode: 'compress', k: 0.5 };

/**
 * Applique la remise à zéro à un ELO.
 *
 * Le résultat est arrondi : un ELO à virgule n'a aucun sens à l'affichage, et
 * se propagerait dans tous les calculs suivants.
 */
export function applyEloReset(elo: number, config: EloResetConfig = RESET_SAISON_1): number {
    const depart = Number.isFinite(elo) ? elo : ELO_BASE;

    switch (config.mode) {
        case 'keep':
            return Math.round(depart);
        case 'reset':
            return ELO_BASE;
        case 'compress': {
            const k = config.k ?? 0.5;
            return Math.round(ELO_BASE + (depart - ELO_BASE) * k);
        }
    }
}

/**
 * L'ordre du classement est-il préservé par ce réglage ?
 *
 * Garde-fou de conception : une compression à facteur POSITIF ne peut pas
 * inverser deux joueurs. Un facteur négatif, si — et ce serait un bug muet,
 * qui ne se verrait qu'au classement du lendemain.
 */
export function preservesOrder(config: EloResetConfig = RESET_SAISON_1): boolean {
    if (config.mode === 'reset') return false;
    if (config.mode === 'keep') return true;
    return (config.k ?? 0.5) > 0;
}

/** Aperçu d'une clôture, pour le contrôle à blanc du script. */
export interface ResetPreview {
    userId: string;
    username: string;
    before: number;
    after: number;
}

export function previewReset(
    joueurs: Array<{ userId: string; username: string; elo: number }>,
    config: EloResetConfig = RESET_SAISON_1,
): ResetPreview[] {
    return joueurs
        .map(j => ({
            userId: j.userId,
            username: j.username,
            before: j.elo,
            after: applyEloReset(j.elo, config),
        }))
        .sort((a, b) => b.before - a.before);
}
