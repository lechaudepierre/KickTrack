import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    increment as firestoreIncrement
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { Venue, VenueInput, VenueFilters } from '@/types';

const VENUES_COLLECTION = 'venues';

// Create a new venue
export async function createVenue(venueInput: VenueInput, userId: string): Promise<Venue> {
    const db = getFirebaseDb();
    const venueRef = doc(collection(db, VENUES_COLLECTION));

    const venue: Venue = {
        venueId: venueRef.id,
        ...venueInput,
        nameLowercase: venueInput.name.toLowerCase().trim(),
        createdAt: new Date(),
        createdBy: userId,
        stats: {
            totalGames: 0,
            activePlayersCount: 0
        }
    };

    await setDoc(venueRef, venue);
    return venue;
}

// Get all venues with optional filters
export async function getVenues(filters?: VenueFilters): Promise<Venue[]> {
    const db = getFirebaseDb();
    let q = query(collection(db, VENUES_COLLECTION), orderBy('name'));

    if (filters?.type) {
        q = query(q, where('type', '==', filters.type));
    }

    if (filters?.limit) {
        q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Venue);
}

// Get venue by ID
export async function getVenueById(venueId: string): Promise<Venue | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, VENUES_COLLECTION, venueId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as Venue;
    }
    return null;
}

// Check for duplicate venue
export async function checkVenueDuplicate(name: string, address?: string): Promise<boolean> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, VENUES_COLLECTION),
        where('nameLowercase', '==', name.toLowerCase().trim())
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

// Update venue stats after a game
export async function updateVenueStats(venueId: string, gameData: { playersCount: number }): Promise<void> {
    const db = getFirebaseDb();
    const venueRef = doc(db, VENUES_COLLECTION, venueId);

    await updateDoc(venueRef, {
        'stats.totalGames': firestoreIncrement(1),
        'stats.lastGameAt': new Date()
    });
}

// Search venues by name
export async function searchVenues(searchQuery: string): Promise<Venue[]> {
    // Note: Firestore doesn't support native full-text search
    // For a production app, use Algolia or a similar service
    const venues = await getVenues();
    const q = searchQuery.toLowerCase();

    return venues.filter(venue =>
        venue.name.toLowerCase().includes(q) ||
        venue.address?.toLowerCase().includes(q)
    );
}

// Recalculate venue stats from games (for fixing existing data)
export async function recalculateVenueStats(): Promise<void> {
    const db = getFirebaseDb();

    // Get all venues
    const venuesSnapshot = await getDocs(collection(db, VENUES_COLLECTION));
    const venueIds = venuesSnapshot.docs.map(d => d.id);

    // Get all completed games
    const gamesQuery = query(
        collection(db, 'games'),
        where('status', '==', 'completed')
    );
    const gamesSnapshot = await getDocs(gamesQuery);

    // Count games per venue
    const gameCountByVenue = new Map<string, number>();
    for (const gameDoc of gamesSnapshot.docs) {
        const game = gameDoc.data();
        const venueId = game.venueId;
        if (venueId) {
            gameCountByVenue.set(venueId, (gameCountByVenue.get(venueId) || 0) + 1);
        }
    }

    // Update each venue's stats
    for (const venueId of venueIds) {
        const count = gameCountByVenue.get(venueId) || 0;
        const venueRef = doc(db, VENUES_COLLECTION, venueId);
        await updateDoc(venueRef, {
            'stats.totalGames': count
        });
    }
}

// Toggle venue favorite for a user
export async function toggleVenueFavorite(userId: string, venueId: string): Promise<void> {
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', userId);

    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const currentFavorites = userData.favoriteVenues || [];

    const isFavorite = currentFavorites.includes(venueId);
    const newFavorites = isFavorite
        ? currentFavorites.filter((id: string) => id !== venueId)
        : [...currentFavorites, venueId];

    await updateDoc(userRef, {
        favoriteVenues: newFavorites
    });
}

// Get user's favorite venues
export async function getUserFavoriteVenues(userId: string): Promise<string[]> {
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', userId);

    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return [];

    const userData = userDoc.data();
    return userData.favoriteVenues || [];
}

// Get user's recently used venues from their games
export async function getUserRecentVenues(userId: string): Promise<string[]> {
    const db = getFirebaseDb();

    const q = query(
        collection(db, 'games'),
        where('status', '==', 'completed'),
        orderBy('endedAt', 'desc'),
        limit(20)
    );

    const snapshot = await getDocs(q);
    const venueIds = new Set<string>();

    snapshot.docs.forEach(doc => {
        const game = doc.data();
        // Check if user played in this game
        const userPlayed = game.teams?.some((team: any) =>
            team.players?.some((player: any) => player.userId === userId)
        );

        if (userPlayed && game.venueId && game.venueId !== 'none') {
            venueIds.add(game.venueId);
        }
    });

    return Array.from(venueIds);
}
