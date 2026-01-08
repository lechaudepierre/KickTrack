export type VenueType = 'bar' | 'home' | 'cercle' | 'other';

export interface VenueStats {
    totalGames: number;
    activePlayersCount: number;
    lastGameAt?: Date;
}

export interface Venue {
    venueId: string;
    name: string;
    type: VenueType;
    address?: string;
    tableCount?: number;
    photoUrl?: string;
    createdAt: Date;
    createdBy: string;
    stats: VenueStats;
}

export interface VenueInput {
    name: string;
    type: VenueType;
    address?: string;
    tableCount?: number;
    photoUrl?: string;
}

export interface VenueFilters {
    type?: VenueType;
    searchQuery?: string;
    limit?: number;
}
