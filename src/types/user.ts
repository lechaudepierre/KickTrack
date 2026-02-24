export interface DailyStats {
    date: string; // YYYY-MM-DD
    gamesPlayed: number;
    wins: number;
    goalsScored: number;
    elo?: number; // Elo at the end of the day
}

export interface UserStats {
    totalGames: number;
    wins: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    winRate: number;
    elo?: number; // Current Elo rating
    eloHistory?: { date: string, elo: number }[]; // Track progress
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
    favoriteVenues?: string[]; // Array of venue IDs
    bannerId?: string; // ID of the equipped banner skin
    friends?: string[]; // Array of userId
    friendRequestsReceived?: string[]; // Array of userId who sent requests
    friendRequestsSent?: string[]; // Array of userId to whom requests were sent
    lastReadNotificationsAt?: Date; // Last time user opened the notifications page
}

export interface FriendRequest {
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    createdAt: Date;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface UserInput {
    username: string;
    email?: string;
    password?: string;
}

export type AccountType = 'quick' | 'complete';
