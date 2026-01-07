// Game-related TypeScript types

export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';

export type GoalType = 'attack' | 'defense' | 'goalkeeper' | 'ownGoal' | 'middle';

export interface Goal {
    timestamp: Date;
    type: GoalType;
    scoredBy: number; // team index (0 or 1)
    points: number; // 1, 2, or 3
}

export interface Team {
    players: string[]; // player IDs
    color: TeamColor;
    goals: Goal[];
}

export interface GameState {
    gameId: string;
    venueId: string;
    venueName: string;
    gameType: '6' | '11'; // Points to win
    teams: [Team, Team];
    score: [number, number];
    multiplier: number; // 1, 2, or 3
    startTime: Date;
    duration: number; // seconds
    isActive: boolean;
    winner?: 0 | 1;
}

export interface GameSetup {
    players: string[]; // 2-4 player IDs
    venueId: string;
    venueName: string;
    gameType: '6' | '11';
}
