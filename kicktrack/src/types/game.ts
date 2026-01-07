// Game-related TypeScript types

export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';

export type GoalType = 'attack' | 'defense' | 'goalkeeper' | 'ownGoal' | 'middle';

export type GoalPosition = 'attack' | 'defense' | 'goalkeeper' | 'midfield';

export interface Goal {
    id?: string;
    timestamp: Date;
    type: GoalType;
    position?: GoalPosition;
    scoredBy: string; // player ID
    scorerName: string;
    teamIndex: 0 | 1;
    points: number; // 1, 2, or 3
}

export interface Team {
    players: Player[]; // Full player objects
    color: TeamColor;
    score: number;
}

export interface Game {
    gameId: string;
    venueId: string;
    venueName: string;
    gameType: '6' | '11'; // Points to win
    teams: [Team, Team];
    score: [number, number];
    multiplier: number; // 1, 2, or 3
    startTime: Date;
    duration: number; // seconds
    status: 'in_progress' | 'completed' | 'abandoned';
    goals: Goal[]; // Flat list of goals for timeline
    winner?: 0 | 1;
    startedAt: Date; // Alias for startTime to match some usages
}

export type GameFormat = '1v1' | '2v2';

export interface Player {
    userId: string;
    username: string;
    avatarUrl?: string;
}

export interface GameSession {
    sessionId: string;
    hostId: string;
    hostName: string;
    venueId: string;
    venueName: string;
    format: GameFormat;
    status: 'waiting' | 'ready' | 'active' | 'finished' | 'cancelled';
    players: Player[];
    maxPlayers: number;
    qrCodeData: string;
    pinCode: string;
    createdAt: Date;
    initiatorId: string;
    expiresAt: Date;
}

export interface GameSetup {
    players: string[]; // 2-4 player IDs
    venueId: string;
    venueName: string;
    gameType: '6' | '11';
}

export interface GameResults {
    game: Game;
    mvp: Player;
    goalsByPlayer: Record<string, number>;
    goalsByPosition: Record<GoalPosition, number>;
}
