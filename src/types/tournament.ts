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
    targetScore: 6 | 11;
    mode: TournamentMode;
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
