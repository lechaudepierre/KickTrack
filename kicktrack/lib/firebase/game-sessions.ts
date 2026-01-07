import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    updateDoc,
    deleteDoc,
    Unsubscribe
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { GameSession, Game, Player, Teams, GameFormat } from '@/types';
import { generatePinCode, generateQRData } from '@/lib/utils/code-generator';

const SESSIONS_COLLECTION = 'game_sessions';
const GAMES_COLLECTION = 'games';

// Create a new game session
export async function createGameSession(
    initiatorId: string,
    initiatorName: string,
    venueId: string,
    venueName: string,
    format: GameFormat
): Promise<GameSession> {
    const db = getFirebaseDb();
    const sessionRef = doc(collection(db, SESSIONS_COLLECTION));
    const pinCode = generatePinCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    const session: GameSession = {
        sessionId: sessionRef.id,
        pinCode,
        qrCodeData: generateQRData(sessionRef.id, pinCode),
        format,
        venueId,
        venueName,
        initiatorId,
        players: [{
            userId: initiatorId,
            username: initiatorName
        }],
        maxPlayers: format === '1v1' ? 2 : 4,
        createdAt: now,
        expiresAt,
        status: 'waiting'
    };

    await setDoc(sessionRef, session);
    return session;
}

// Join a game session
export async function joinGameSession(
    sessionId: string,
    player: Player
): Promise<GameSession | null> {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) return null;

    const session = sessionSnap.data() as GameSession;

    // Check if player already joined
    if (session.players.some(p => p.userId === player.userId)) {
        return session;
    }

    // Check if session is full
    if (session.players.length >= session.maxPlayers) {
        throw new Error('Session is full');
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
        throw new Error('Session has expired');
    }

    const updatedPlayers = [...session.players, player];
    const isReady = updatedPlayers.length === session.maxPlayers;

    await updateDoc(sessionRef, {
        players: updatedPlayers,
        status: isReady ? 'ready' : 'waiting'
    });

    return { ...session, players: updatedPlayers, status: isReady ? 'ready' : 'waiting' };
}

// Get session by PIN code
export async function getSessionByPinCode(pinCode: string): Promise<GameSession | null> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('pinCode', '==', pinCode.toUpperCase()),
        where('status', 'in', ['waiting', 'ready'])
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as GameSession;
}

// Get session by ID
export async function getGameSession(sessionId: string): Promise<GameSession | null> {
    const db = getFirebaseDb();
    const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as GameSession;
    }
    return null;
}

// Subscribe to session updates (real-time)
export function subscribeToSession(
    sessionId: string,
    callback: (session: GameSession | null) => void
): Unsubscribe {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);

    return onSnapshot(sessionRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as GameSession);
        } else {
            callback(null);
        }
    });
}

// Start the game (create game document from session)
export async function startGame(
    sessionId: string,
    teams: Teams,
    targetScore: 6 | 11 = 6
): Promise<Game> {
    const db = getFirebaseDb();
    const gameRef = doc(collection(db, GAMES_COLLECTION));
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
        throw new Error('Session not found');
    }

    const session = sessionSnap.data() as GameSession;

    const game: Game = {
        gameId: gameRef.id,
        sessionId,
        format: session.format,
        venueId: session.venueId,
        venueName: session.venueName,
        teams: [
            { players: teams.team1, score: 0 },
            { players: teams.team2, score: 0 }
        ],
        goals: [],
        targetScore,
        status: 'in_progress',
        startedAt: new Date()
    };

    await setDoc(gameRef, game);

    // Update session status
    await updateDoc(sessionRef, { status: 'started' });

    return game;
}

// Cancel/delete a session
export async function cancelSession(sessionId: string): Promise<void> {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await deleteDoc(sessionRef);
}

// Update session status
export async function updateSessionStatus(
    sessionId: string,
    status: GameSession['status']
): Promise<void> {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, { status });
}
