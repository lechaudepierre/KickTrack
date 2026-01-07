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
        where('name', '==', name.toLowerCase().trim())
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
    const query = searchQuery.toLowerCase();

    return venues.filter(venue =>
        venue.name.toLowerCase().includes(query) ||
        venue.address?.toLowerCase().includes(query)
    );
}
