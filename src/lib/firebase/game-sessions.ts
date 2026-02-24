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
    Unsubscribe,
    Timestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { GameSession, Game, Player, Team, GameFormat } from '@/types';
import { generatePinCode } from '@/lib/utils/code-generator';

const SESSIONS_COLLECTION = 'game_sessions';
const GAMES_COLLECTION = 'games';

// Create a new game session
export async function createGameSession(
    hostId: string,
    hostName: string,
    venueId: string,
    venueName: string,
    format: GameFormat
): Promise<GameSession> {
    const db = getFirebaseDb();
    const sessionRef = doc(collection(db, SESSIONS_COLLECTION));
    const pinCode = generatePinCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 1000); // 90 seconds (kept alive by heartbeat)

    const session: GameSession = {
        sessionId: sessionRef.id,
        pinCode,
        format,
        venueId,
        venueName,
        hostId,
        hostName,
        initiatorId: hostId, // Keep for backward compatibility if needed, or remove from type later
        players: [{
            userId: hostId,
            username: hostName
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

    // Sanitize player object to remove undefined values
    const safePlayer = {
        userId: player.userId,
        username: player.username,
        avatarUrl: player.avatarUrl || null
    };

    const updatedPlayers = [...session.players, safePlayer];
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

    const session = snapshot.docs[0].data() as GameSession;

    // Reject expired sessions (host may have left without proper cleanup)
    const exp = (session.expiresAt as any)?.toDate ? (session.expiresAt as any).toDate() : new Date(session.expiresAt as any);
    if (exp <= new Date()) return null;

    return session;
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
    teams: [Team, Team]
): Promise<Game> {
    const db = getFirebaseDb();
    const gameRef = doc(collection(db, GAMES_COLLECTION));
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
        throw new Error('Session not found');
    }

    const session = sessionSnap.data() as GameSession;

    // Check if any player is a guest
    const hasGuestPlayers = teams.some(team =>
        team.players.some(player => player.userId.startsWith('guest_'))
    );

    // Sanitize teams to remove undefined values
    const sanitizedTeams = teams.map(team => ({
        ...team,
        players: team.players.map(player => ({
            ...player,
            avatarUrl: player.avatarUrl || null
        }))
    })) as [Team, Team];

    const game: Game = {
        gameId: gameRef.id,
        venueId: session.venueId || 'unknown',
        venueName: session.venueName || 'Unknown Venue',
        teams: sanitizedTeams,
        score: [0, 0],
        multiplier: 1,
        startTime: new Date(),
        duration: 0,
        status: 'in_progress',
        goals: [],
        startedAt: new Date(),
        playerIds: sanitizedTeams.flatMap(t => t.players.map(p => p.userId || '')).filter(id => id !== ''),
        hostId: session.hostId,
        sessionId: session.sessionId,
        isGuestGame: hasGuestPlayers // Mark guest games
    };

    await setDoc(gameRef, game);

    // Update session status and store gameId
    await updateDoc(sessionRef, {
        status: 'active',
        gameId: gameRef.id
    });

    return game;
}

// Extend session expiry (heartbeat from host to prove they're still present)
export async function updateSessionExpiry(sessionId: string): Promise<void> {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const newExpiry = new Date(Date.now() + 90 * 1000); // extend 90 more seconds
    await updateDoc(sessionRef, { expiresAt: newExpiry });
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

// Get all active sessions (waiting or ready, not expired)
export async function getActiveSessions(): Promise<GameSession[]> {
    const db = getFirebaseDb();
    const now = Timestamp.now();
    const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('status', 'in', ['waiting', 'ready'])
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(d => d.data() as GameSession)
        .filter(s => {
            // Filter out expired sessions client-side (expiresAt may be Date or Firestore Timestamp)
            const exp = (s.expiresAt as any)?.toDate ? (s.expiresAt as any).toDate() : new Date(s.expiresAt as any);
            return exp > now.toDate();
        });
}

// Subscribe to active sessions in real-time
export function subscribeToActiveSessions(
    callback: (sessions: GameSession[]) => void
): Unsubscribe {
    const db = getFirebaseDb();
    const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('status', '==', 'waiting')
    );
    return onSnapshot(q, (snapshot) => {
        const now = new Date();
        const sessions = snapshot.docs
            .map(d => d.data() as GameSession)
            .filter(s => {
                const exp = (s.expiresAt as any)?.toDate ? (s.expiresAt as any).toDate() : new Date(s.expiresAt as any);
                // Only sessions not expired and with available slots
                return exp > now && s.players.length < s.maxPlayers;
            });
        callback(sessions);
    });
}

// Kick a player from a session (host only)
export async function kickPlayerFromSession(
    sessionId: string,
    targetUserId: string
): Promise<void> {
    const db = getFirebaseDb();
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) return;

    const session = sessionSnap.data() as GameSession;
    const updatedPlayers = session.players.filter(p => p.userId !== targetUserId);
    const newStatus = updatedPlayers.length < session.maxPlayers ? 'waiting' : session.status;

    await updateDoc(sessionRef, {
        players: updatedPlayers,
        status: newStatus
    });
}
