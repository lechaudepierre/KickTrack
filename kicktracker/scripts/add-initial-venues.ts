// Script to add initial venues to Firebase
// Run with: npx tsx scripts/add-initial-venues.ts

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const VENUES_COLLECTION = 'venues';

async function addInitialVenues() {
    console.log('Adding initial venues...');

    const venues = [
        {
            name: 'Coloc présidentielle',
            type: 'home',
            address: 'Buyl 100'
        },
        {
            name: 'Cercle Polytechnique',
            type: 'cercle'
        }
    ];

    for (const venueData of venues) {
        try {
            const venueRef = doc(collection(db, VENUES_COLLECTION));

            const venue = {
                venueId: venueRef.id,
                ...venueData,
                createdAt: Timestamp.now(),
                createdBy: 'system',
                stats: {
                    totalGames: 0,
                    activePlayersCount: 0
                }
            };

            await setDoc(venueRef, venue);
            console.log(`✓ Added venue: ${venue.name} (${venue.type})`);
        } catch (error) {
            console.error(`✗ Error adding venue ${venueData.name}:`, error);
        }
    }

    console.log('✓ All venues added successfully!');
}

// Run the script
addInitialVenues()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
