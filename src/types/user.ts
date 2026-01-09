export interface DailyStats {
    date: string; // YYYY-MM-DD
    gamesPlayed: number;
    wins: number;
    goalsScored: number;
}

export interface UserStats {
    totalGames: number;
    wins: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    winRate: number;
    history?: Record<string, DailyStats>; // Key is YYYY-MM-DD
}

export interface User {
    userId: string;
    username: string;
    usernameLowercase: string;
    email?: string;
    avatarUrl?: string;
    createdAt: Date;
    stats: UserStats;
    preferences?: {
        favoriteVenue?: string;
        notifications?: boolean;
    };
}

export interface UserInput {
    username: string;
    email?: string;
    password?: string;
}

export type AccountType = 'quick' | 'complete';
