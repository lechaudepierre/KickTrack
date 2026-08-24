/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CALCUL PUR : ELO, MVP, RÉSULTATS DE PARTIE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Module SANS effet de bord : aucune lecture, aucune écriture, aucun accès
 * Firebase. Il prend un état de partie et rend des nombres.
 *
 * Pourquoi isolé (Doc/v2-refactor/11-classement-elo.md, chantier 1.5) :
 * 1. le serveur (route API) et le client partagent EXACTEMENT le même calcul ;
 * 2. c'est testable unitairement, ce qui est exigé avant toute refonte
 * de la formule 2v2.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ PHILOSOPHIE : L'ELO EST INFLATIONNISTE, ET C'EST VOULU.
 *
 * Le système CRÉE des points (bonus MVP, récompenses d'activité) : la somme
 * d'ELO de la population monte avec le temps. Ce n'est PAS un bug.
 * C'est un choix produit assumé : on récompense l'activité et les exploits.
 *
 * La contrepartie obligatoire est le SOFT RESET SAISONNIER, qui éponge
 * l'inflation (Doc/v2-refactor/31-saisons.md). Les deux vont ensemble.
 *
 * [interdit] NE PAS « CORRIGER » L'INFLATION en croyant à un bug. Sans le soft reset,
 * l'inflation rendrait les anciens imbattables par simple ancienneté.
 * ───────────────────────────────────────────────────────────────────────────
 */

import type { Team, Goal } from '@/types/game';

// ─── Constantes de calibrage ─────────────────────────────────────────────────
// Doc 11 : « Conserver base 1000, K=64 (<10 parties) puis 32 — sauf décision
// contraire. » Ces valeurs sont des points de décision ouverts (99, ELO).

export const ELO_BASE = 1000;
export const K_FACTOR_PLACEMENT = 64;
export const K_FACTOR_STANDARD = 32;
export const PLACEMENT_GAMES = 10;

/** Bonus d'ELO accordé au MVP de la partie. Source d'inflation assumée. */
export const MVP_ELO_BONUS = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EloUpdate {
    /** Delta à appliquer à l'ELO courant. JAMAIS une valeur absolue — voir note ci-dessous. */
    eloChange: number;
}

export interface PlayerEloResult {
    userId: string;
    username: string;
    previousElo: number;
    newElo: number;
    eloChange: number;
    isMVP: boolean;
    /**
     * Le joueur a battu son record personnel sur cette partie.
     * Renseigné par la route serveur : elle seule connaît le pic d'avant,
     * puisqu'il est écrasé dès que les stats sont écrites.
     */
    isRecord?: boolean;
    /** Victoires consécutives après cette partie. 0 sur une défaite. */
    winStreak?: number;
}

export type GameEloChanges = Record<string, Omit<PlayerEloResult, 'userId'>>;

export interface PlayerEloInput {
    userId: string;
    username: string;
    elo: number;
    gamesPlayed: number;
}

// ─── Helpers ELO ─────────────────────────────────────────────────────────────

/** K-Factor : 64 pendant le placement (10 premières parties), 32 ensuite. */
export function getKFactor(gamesPlayed: number): number {
    return gamesPlayed < PLACEMENT_GAMES ? K_FACTOR_PLACEMENT : K_FACTOR_STANDARD;
}

/** Probabilité de victoire attendue selon l'écart d'ELO (formule ELO standard). */
export function calculateProbability(rating1: number, rating2: number): number {
    return 1.0 / (1.0 + Math.pow(10, (rating2 - rating1) / 400.0));
}

/**
 * Variation d'ELO en 2v2.
 *
 * Moyenne 50/50 entre la probabilité de l'ÉQUIPE et la probabilité PERSONNELLE
 * du joueur face à la moyenne adverse.
 *
 * ⚠️ DÉFAUT CONNU, NON CORRIGÉ ICI (décision D10, Doc/v2-refactor/99) :
 * un joueur faible porté par un partenaire fort gagne presque autant que
 * s'il avait gagné seul — sa probabilité personnelle basse gonfle son gain.
 * Le système récompense donc le « portage ».
 * La refonte est BLOQUÉE tant que l'équipe n'a pas tranché 4 leviers
 * (pondération équipe/individu, effet du partenaire fort, marge de score,
 * rôle des buts). Ne pas improviser une correction ici.
 */
export function calculateEloChange2v2(
    playerElo: number,
    partnerElo: number,
    opponentAvgElo: number,
    result: 0 | 1,
    gamesPlayed: number
): EloUpdate {
    const teamAvgElo = (playerElo + partnerElo) / 2;
    const teamProb = calculateProbability(teamAvgElo, opponentAvgElo);
    const personalProb = calculateProbability(playerElo, opponentAvgElo);
    const finalProb = (teamProb + personalProb) / 2;

    return { eloChange: Math.round(getKFactor(gamesPlayed) * (result - finalProb)) };
}

/** Variation d'ELO en 1v1 : formule ELO standard. */
export function calculateEloChange1v1(
    playerElo: number,
    opponentElo: number,
    result: 0 | 1,
    gamesPlayed: number
): EloUpdate {
    const prob = calculateProbability(playerElo, opponentElo);
    return { eloChange: Math.round(getKFactor(gamesPlayed) * (result - prob)) };
}

// ─── MVP ─────────────────────────────────────────────────────────────────────

/**
 * LA définition unique du MVP (chantier 1.2).
 *
 * Rôle : attaquant s'il a marqué depuis 'attack', défenseur sinon.
 * Attaquant : (ses buts / buts de l'équipe) × 90
 * Défenseur : clean sheet → 95, sinon max(0, (1 − buts encaissés / target) × 100)
 * Égalité : le joueur de l'équipe gagnante l'emporte.
 *
 * ⚠️ Il existait une SECONDE définition concurrente (« celui qui a marqué le
 * plus de buts ») dans `calculateGameResults()`, source d'incohérences
 * d'affichage. Elle a été supprimée : tout consommateur lit `game.mvpId`.
 */
export function computeMVP(teams: Team[], goals: Goal[], winner: 0 | 1): string | null {
    const target = Math.max(teams[0].score, teams[1].score);
    if (target === 0) return null;

    const scores: { userId: string; score: number; isWinner: boolean }[] = [];

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
        const team = teams[teamIndex];
        const isWinner = teamIndex === winner;
        const goalsConceded = teams[1 - teamIndex].score;
        const teamGoals = team.score;

        for (const player of team.players) {
            if (isGuestId(player.userId)) continue;

            const playerGoals = goals.filter(g => g.scoredBy === player.userId);
            const attackGoals = playerGoals.filter(g => g.position === 'attack').length;
            const isAttacker = attackGoals > 0;

            const score = isAttacker
                ? (teamGoals > 0 ? (attackGoals / teamGoals) * 90 : 0)
                : (goalsConceded === 0 ? 95 : Math.max(0, (1 - goalsConceded / target) * 100));

            scores.push({ userId: player.userId, score, isWinner });
        }
    }

    if (scores.length === 0) return null;

    scores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.isWinner ? 1 : 0) - (a.isWinner ? 1 : 0);
    });

    return scores[0].userId;
}

// ─── Utilitaires partagés ────────────────────────────────────────────────────

/** Les invités ne sont jamais comptabilisés dans les stats ni l'ELO. */
export function isGuestId(userId: string): boolean {
    return userId.startsWith('guest_');
}

export function hasGuestPlayers(teams: Team[]): boolean {
    return teams.some(team => team.players.some(p => isGuestId(p.userId)));
}

/** Buts marqués par joueur, à partir de la timeline. */
export function goalsByPlayer(goals: Goal[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const goal of goals) {
        out[goal.scoredBy] = (out[goal.scoredBy] || 0) + 1;
    }
    return out;
}

/**
 * Calcule la variation d'ELO de TOUS les joueurs d'une partie.
 *
 * ⚠️ RETOURNE DES DELTAS, PAS DES VALEURS ABSOLUES (chantier 1.1).
 *
 * L'ancienne implémentation calculait un `newElo` absolu à partir d'une
 * lecture faite HORS transaction, puis l'écrivait tel quel. Deux parties
 * du même joueur terminées en parallèle → la seconde écrasait la première.
 *
 * L'appelant DOIT écrire `eloActuelReluDansLaTransaction + eloChange`.
 * Le `newElo` renvoyé ici sert UNIQUEMENT à l'affichage.
 *
 * Le bonus MVP est intégré ici, en UN SEUL endroit (chantier 1.3) : affichage
 * et stockage ne peuvent plus diverger puisqu'ils lisent la même valeur.
 */
export function computeGameEloChanges(
    teams: Team[],
    goals: Goal[],
    winner: 0 | 1,
    players: Record<string, PlayerEloInput>
): { eloChanges: GameEloChanges; mvpId: string | null } {
    const eloChanges: GameEloChanges = {};

    if (hasGuestPlayers(teams)) {
        return { eloChanges, mvpId: null };
    }

    const mvpId = computeMVP(teams, goals, winner);
    const is1v1 = teams[0].players.length === 1 && teams[1].players.length === 1;
    const is2v2 = teams[0].players.length === 2 && teams[1].players.length === 2;

    for (let teamIndex = 0; teamIndex < teams.length; teamIndex++) {
        const team = teams[teamIndex];
        const opponentTeam = teams[1 - teamIndex];
        const result: 0 | 1 = teamIndex === winner ? 1 : 0;

        const opponentAvgElo = opponentTeam.players.length > 0
            ? opponentTeam.players.reduce(
                (sum, p) => sum + (players[p.userId]?.elo ?? ELO_BASE), 0
              ) / opponentTeam.players.length
            : ELO_BASE;

        for (const player of team.players) {
            const self = players[player.userId];
            const playerElo = self?.elo ?? ELO_BASE;
            const gamesPlayed = self?.gamesPlayed ?? 0;

            let update: EloUpdate | null = null;

            if (is2v2) {
                const partner = team.players.find(p => p.userId !== player.userId);
                if (partner) {
                    const partnerElo = players[partner.userId]?.elo ?? ELO_BASE;
                    update = calculateEloChange2v2(playerElo, partnerElo, opponentAvgElo, result, gamesPlayed);
                }
            } else if (is1v1) {
                const opponentElo = players[opponentTeam.players[0].userId]?.elo ?? ELO_BASE;
                update = calculateEloChange1v1(playerElo, opponentElo, result, gamesPlayed);
            }

            if (!update) continue;

            // Bonus MVP appliqué UNE SEULE FOIS, ici.
            const isMVP = player.userId === mvpId;
            const eloChange = update.eloChange + (isMVP ? MVP_ELO_BONUS : 0);

            eloChanges[player.userId] = {
                username: player.username,
                previousElo: playerElo,
                newElo: playerElo + eloChange,
                eloChange,
                isMVP,
            };
        }
    }

    return { eloChanges, mvpId };
}

/**
 * Pic d'ELO d'un joueur, reconstitué depuis son historique.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ÇA MARCHE SANS MIGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * `stats.eloHistory` existe depuis toujours : une entrée par partie
 * comptabilisée. Le maximum de cette liste EST le pic d'ELO, pour les 147
 * comptes créés avant que `peakElo` ne soit suivi explicitement.
 *
 * On prend le maximum des trois sources disponibles :
 * - `peakElo`, exact, alimenté depuis le 20/08
 * - le maximum de `eloHistory`, reconstitué
 * - l'ELO courant, qui peut être un record en cours
 *
 * ATTENTION — `eloHistory` a des trous : parties avec invités, parties
 * abandonnées, et toute période où l'écriture a échoué. Le pic reconstitué est
 * donc un plancher, jamais une valeur certifiée. C'est suffisant pour un
 * affichage de fierté ; ça ne le serait pas pour attribuer une récompense.
 */
export function resolvePeakElo(stats: {
    elo?: number;
    peakElo?: number;
    eloHistory?: { date: string; elo: number }[];
} | undefined | null): number {
    if (!stats) return ELO_BASE;

    const current = stats.elo ?? ELO_BASE;
    const tracked = stats.peakElo ?? 0;
    const fromHistory = (stats.eloHistory ?? []).reduce(
        (max, entry) => (typeof entry?.elo === 'number' && entry.elo > max ? entry.elo : max),
        0
    );

    return Math.max(current, tracked, fromHistory);
}
