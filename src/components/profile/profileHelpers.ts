import { toDate } from '@/lib/game/dates';
/**
 * Fonctions d'affichage du profil — pures, sans état.
 *
 * Elles vivaient dans `ProfileContent` en fermeture sur `profileUser`, ce qui
 * les rendait impossibles à réutiliser depuis un composant d'onglet sans les
 * passer en props. Sorties ici, elles prennent l'identifiant du joueur en
 * paramètre : même comportement, mais utilisables partout.
 */

import type { Game } from '@/types';

export function formatDate(date: Date | { seconds: number } | null | undefined): string {
    if (!date) return '';
    // `startedAt` arrive soit en Date, soit en Timestamp Firestore ({ seconds }).
    const d = toDate(date);
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(d);
}

/** Index de l'équipe du joueur dans la partie, ou -1 s'il n'y a pas joué. */
function teamIndexOf(game: Game, userId: string): number {
    return game.teams.findIndex(t => t.players.some(p => p.userId === userId));
}

export function getGameResult(game: Game, userId: string): string {
    if (game.winner === undefined) return 'Nul';
    const index = teamIndexOf(game, userId);
    if (index === -1) return '?';
    return game.winner === index ? 'Victoire' : 'Défaite';
}

export function getOpponentNames(game: Game, userId: string): string {
    const index = teamIndexOf(game, userId);
    if (index === -1) return '';
    return game.teams[1 - index].players.map(p => p.username).join(' & ');
}

export function getTeammateName(game: Game, userId: string): string | null {
    const team = game.teams.find(t => t.players.some(p => p.userId === userId));
    if (!team || team.players.length < 2) return null;
    return team.players.find(p => p.userId !== userId)?.username ?? null;
}

export function getEloChange(game: Game, userId: string): number | null {
    return game.eloChanges?.[userId]?.eloChange ?? null;
}

/** Score de la partie, dans l'ordre [joueur, adversaire]. */
export function getScoreForUser(game: Game, userId: string): string {
    const index = teamIndexOf(game, userId);
    if (index === -1) return `${game.score[0]} - ${game.score[1]}`;
    return `${game.score[index]} - ${game.score[1 - index]}`;
}
