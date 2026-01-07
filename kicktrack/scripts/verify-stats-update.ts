import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { endGame } from '../src/lib/firebase/games';
import { Game, Team, Player } from '../src/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

import { getAuth, signInAnonymously } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function verifyStatsUpdate() {
    console.log('🚀 Starting stats update verification...');

    // Sign in anonymously
    await signInAnonymously(auth);
    console.log('Signed in anonymously');

    const testGameId = 'test-stats-game-' + Date.now();
    const testUserId = 'test-user-stats';
    const today = new Date().toISOString().split('T')[0];

    // 1. Create a test user
    console.log('Creating test user...');
    await setDoc(doc(db, 'users', testUserId), {
        userId: testUserId,
        username: 'Test Stats User',
        createdAt: new Date(),
        stats: {
            totalGames: 10,
            wins: 5,
            losses: 5,
            goalsScored: 20,
            goalsConceded: 20,
            winRate: 0.5
        }
    });

    // 2. Create a test game
    console.log('Creating test game...');
    const testPlayer: Player = {
        userId: testUserId,
        username: 'Test Stats User',
        avatarUrl: undefined
    };

    const team1: Team = {
        players: [testPlayer],
        score: 10,
        color: 'blue'
    };

    const team2: Team = {
        players: [], // Dummy opponent
        score: 5,
        color: 'red'
    };

    const gameData: Game = {
        gameId: testGameId,
        venueId: 'test-venue',
        venueName: 'Test Venue',
        status: 'in_progress',
        startTime: new Date(),
        startedAt: new Date(),
        duration: 0,
        multiplier: 1,
        teams: [team1, team2],
        score: [10, 5],
        gameType: '11',
        goals: [
            {
                id: 'goal-1',
                timestamp: new Date(),
                type: 'attack',
                position: 'attack',
                scoredBy: testUserId,
                scorerName: 'Test Stats User',
                teamIndex: 0,
                points: 1
            }
        ],
        playerIds: [testUserId]
    };

    await setDoc(doc(db, 'games', testGameId), gameData);

    // 3. End the game
    console.log('Ending game...');
    await endGame(testGameId);

    // 4. Verify user stats
    console.log('Verifying user stats...');
    const userDoc = await getDoc(doc(db, 'users', testUserId));
    const userData = userDoc.data();

    if (!userData) {
        console.error('❌ User not found!');
        return;
    }

    const stats = userData.stats;
    console.log('Updated Stats:', JSON.stringify(stats, null, 2));

    // Check lifetime stats
    if (stats.totalGames !== 11) console.error('❌ Total games incorrect');
    if (stats.wins !== 6) console.error('❌ Wins incorrect');
    if (stats.goalsScored !== 21) console.error('❌ Goals scored incorrect');

    // Check daily stats
    if (!stats.history) {
        console.error('❌ History field missing!');
    } else {
        const daily = stats.history[today];
        if (!daily) {
            console.error(`❌ Daily stats for ${today} missing!`);
        } else {
            console.log(`Daily stats for ${today}:`, daily);
            if (daily.gamesPlayed !== 1) console.error('❌ Daily games played incorrect');
            if (daily.wins !== 1) console.error('❌ Daily wins incorrect');
            if (daily.goalsScored !== 1) console.error('❌ Daily goals scored incorrect');

            if (daily.gamesPlayed === 1 && daily.wins === 1 && daily.goalsScored === 1) {
                console.log('✅ Daily stats verified successfully!');
            }
        }
    }
}

verifyStatsUpdate().catch(console.error);
