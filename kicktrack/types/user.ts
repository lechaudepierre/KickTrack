export interface UserStats {
    totalGames: number;
    wins: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    winRate: number;
}

export interface User {
    userId: string;
    username: string;
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
