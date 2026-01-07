import { User } from './user';

export type GameFormat = '1v1' | '2v2';
export type GameStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';
export type GoalPosition = 'defense' | 'attack1' | 'attack2' | 'attack3';

export interface Player {
    userId: string;
    username: string;
    avatarUrl?: string;
}

export interface Team {
    players: Player[];
    score: number;
}

export interface Goal {
    goalId: string;
    scorerId: string;
    scorerName: string;
    teamIndex: 0 | 1;
    position: GoalPosition;
    timestamp: Date;
}

export interface GameSession {
    sessionId: string;
    pinCode: string;
    qrCodeData: string;
    format: GameFormat;
    venueId: string;
    venueName: string;
    initiatorId: string;
    players: Player[];
    maxPlayers: number;
    createdAt: Date;
    expiresAt: Date;
    status: 'waiting' | 'ready' | 'started' | 'expired';
}

export interface Game {
    gameId: string;
    sessionId: string;
    format: GameFormat;
    venueId: string;
    venueName: string;
    teams: [Team, Team];
    goals: Goal[];
    targetScore: 6 | 11;
    status: GameStatus;
    startedAt: Date;
    endedAt?: Date;
    winnerId?: string; // Index of winning team (0 or 1)
    duration?: number; // in seconds
}

export interface GameResults {
    game: Game;
    mvp: Player;
    goalsByPlayer: Record<string, number>;
    goalsByPosition: Record<GoalPosition, number>;
}

export interface Teams {
    team1: Player[];
    team2: Player[];
}
