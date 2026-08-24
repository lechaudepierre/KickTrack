// Tournament-related TypeScript types

import { Player, TeamColor, GameFormat } from './game';

export type TournamentFormat = '1v1' | '2v2';
export type TournamentMode = 'round_robin' | 'bracket';
export type TournamentStatus = 'waiting' | 'team_setup' | 'in_progress' | 'completed' | 'cancelled';
export type TournamentMatchStatus = 'pending' | 'in_progress' | 'completed' | 'bye';

export interface TournamentTeam {
    teamId: string;
    name: string;
    players: Player[];
    color?: TeamColor;
}

export interface TournamentMatch {
    matchId: string;
    gameId?: string;
    team1: TournamentTeam;
    team2: TournamentTeam;
    winnerId?: string;
    score?: [number, number];
    status: TournamentMatchStatus;
    round?: number;
    matchNumber?: number;
}

export interface TournamentStanding {
    teamId: string;
    teamName: string;
    players: Player[];
    played: number;
    wins: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
}

export interface BracketRound {
    roundNumber: number;
    roundName: string;
    matches: TournamentMatch[];
}

export interface Tournament {
    tournamentId: string;
    name: string;
    hostId: string;
    hostName: string;
    venueId: string;
    venueName: string;
    format: TournamentFormat;
    /**
     * ⚠️ HÉRITÉ — plus écrit depuis le 23/08, jamais lu.
     *
     * Le score de victoire n'est plus demandé à la création (retiré le 21/08)
     * et le moteur ne l'a jamais consulté : une partie se termine quand l'hôte
     * le décide. Le champ reste déclaré, optionnel, parce que les tournois
     * déjà enregistrés le portent — mais aucun code ne doit s'y fier.
     */
    targetScore?: 6 | 11;
    /** Format du tournoi : round_robin ou bracket. Rien à voir avec `modeId`. */
    mode: TournamentMode;
    /**
     * Mode de jeu appliqué à TOUS les matchs du tournoi (chantier 9.11).
     * Absent = mode normal.
     * Choisi une fois à la création : un tournoi où les règles changeraient
     * d'un match à l'autre n'aurait aucun sens.
     */
    modeId?: string;
    players: Player[];
    teams: TournamentTeam[];
    maxTeams: number;
    pinCode: string;
    status: TournamentStatus;
    createdAt: Date;
    expiresAt: Date;
    standings?: TournamentStanding[];
    bracket?: BracketRound[];
    matches: TournamentMatch[];
    currentMatchIndex?: number;
}

export interface TournamentResults {
    tournament: Tournament;
    winner: TournamentTeam;
    topScorer?: {
        player: Player;
        goals: number;
    };
    standings: TournamentStanding[];
}
