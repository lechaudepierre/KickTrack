import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    signOut,
    updateProfile,
    linkWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    Unsubscribe,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './config';
import { User, UserStats } from '@/types';

// Initial stats for new users
const initialStats: UserStats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    winRate: 0
};

// Create user document in Firestore
async function createUserDocument(userId: string, username: string, email?: string): Promise<User> {
    const db = getFirebaseDb();
    const user: User = {
        userId,
        username,
        usernameLowercase: username.toLowerCase().trim(),
        email,
        createdAt: new Date(),
        stats: initialStats,
        preferences: {
            notifications: true
        }
    };

    await setDoc(doc(db, 'users', userId), user);
    return user;
}

// Quick registration (anonymous auth with username)
export async function registerQuick(username: string): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName: username });
    return createUserDocument(result.user.uid, username);
}

// Complete registration (email + password)
export async function registerComplete(
    username: string,
    email: string,
    password: string
): Promise<User> {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: username });

    // Wait for the auth token to be ready before writing to Firestore
    await result.user.getIdToken(true);

    // Check username availability after auth (when we have permission to read)
    const isAvailable = await checkUsernameAvailable(username);
    if (!isAvailable) {
        // Delete the auth user since we can't complete registration
        await result.user.delete();
        throw new Error('Ce nom d\'utilisateur est déjà pris');
    }

    return createUserDocument(result.user.uid, username, email);
}

// Login with email/password
export async function login(email: string, password: string): Promise<User | null> {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));

    if (userDoc.exists()) {
        return userDoc.data() as User;
    }
    return null;
}

// Logout
export async function logout(): Promise<void> {
    const auth = getFirebaseAuth();
    await signOut(auth);
}

// Upgrade anonymous account to email/password
export async function upgradeAccount(email: string, password: string): Promise<void> {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');

    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(currentUser, credential);

    // Update user document with email
    await updateDoc(doc(db, 'users', currentUser.uid), {
        email
    });
}

// Update username
export async function updateUsername(userId: string, newUsername: string): Promise<void> {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
        throw new Error('Non autorisé');
    }

    // 1. Update Firebase Auth Profile
    await updateProfile(currentUser, { displayName: newUsername });

    // 2. Update Firestore User Document
    await updateDoc(doc(db, 'users', userId), {
        username: newUsername,
        usernameLowercase: newUsername.toLowerCase().trim()
    });
}

// Get current user data
export async function getCurrentUser(): Promise<User | null> {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        return userDoc.data() as User;
    }
    return null;
}

// Subscribe to user data
export function subscribeToUser(userId: string, callback: (user: User | null) => void): Unsubscribe {
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', userId);

    return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as User);
        } else {
            callback(null);
        }
    });
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, callback);
}

// Check if username is available
export async function checkUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, 'users'),
        where('usernameLowercase', '==', username.toLowerCase().trim())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return true;

    // If we have a match, check if it's the user we want to exclude
    if (excludeUserId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeUserId) {
        return true;
    }

    return !snapshot.empty ? false : true;
}

// Get leaderboard (top users by wins)
export async function getLeaderboard(limitCount: number = 20): Promise<User[]> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, 'users'),
        orderBy('stats.wins', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
}
