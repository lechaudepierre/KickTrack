import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    linkWithCredential,
    EmailAuthProvider,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
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
    winRate: 0,
    elo: 1000
};

// Create user document in Firestore
export async function createUserDocument(userId: string, username: string, email?: string): Promise<User> {
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

// Complete registration (email + password)
export async function registerComplete(
    username: string,
    email: string,
    password: string
): Promise<User> {
    if (username.length > 25) {
        throw new Error('Le pseudo ne peut pas dépasser 25 caractères');
    }

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

    // Confirmation de l'adresse, dès l'inscription.
    //
    // Ce n'est pas une formalité : Firebase supprime un mot de passe dont
    // l'adresse n'est pas vérifiée à la première connexion Google. Confirmer
    // l'adresse rend les deux méthodes compatibles pour de bon.
    //
    // L'échec ne doit JAMAIS faire échouer l'inscription — le compte est déjà
    // créé à ce stade, et Firebase limite le nombre d'envois. Le bandeau du
    // tableau de bord rattrapera le joueur.
    try {
        await sendEmailVerification(result.user);
    } catch {
        // silencieux : voir EmailVerificationBanner
    }

    return createUserDocument(result.user.uid, username, email);
}

/**
 * (Ré)envoie le mail de confirmation d'adresse au compte connecté.
 *
 * Utilisé par le bandeau du tableau de bord pour les 140 comptes créés avant
 * que l'envoi soit automatique.
 *
 * @throws si personne n'est connecté, ou si Firebase limite les envois
 *         (`auth/too-many-requests`).
 */
export async function sendVerificationEmail(): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Aucun compte connecté');
    await sendEmailVerification(currentUser);
}

/**
 * Redemande à Firebase l'état du compte.
 *
 * Le drapeau `emailVerified` est figé dans le jeton local : après un clic sur
 * le lien reçu par mail, il reste faux tant qu'on n'a pas rechargé. Sans ça,
 * le bandeau resterait affiché jusqu'à la prochaine connexion.
 */
export async function refreshVerificationStatus(): Promise<boolean> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    await currentUser.reload();
    await currentUser.getIdToken(true);
    return auth.currentUser?.emailVerified ?? false;
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

// Send password reset email
export async function resetPassword(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
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
    if (newUsername.length > 25) {
        throw new Error('Le pseudo ne peut pas dépasser 25 caractères');
    }

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

// Get any user data by ID
export async function getUserById(userId: string): Promise<User | null> {
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', userId));
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

//klqsfklsdjflksdjflksdjf


// ─── Connexion Google ────────────────────────────────────────────────────────
//
// La connexion Google s'ajoute à l'email/mot de passe, elle ne le remplace pas :
// sur les 147 comptes existants, 34 utilisent une adresse non-Google (hotmail,
// icloud, yahoo, ulb.be…) et ne pourront jamais s'en servir.
//
// Le projet est réglé sur « une seule adresse par compte ». Consequence : quand
// une adresse a déjà un compte mot de passe, Firebase REFUSE la connexion
// Google avec `auth/account-exists-with-different-credential`. On rattache
// alors le fournisseur Google au compte existant — le même UID est conservé,
// donc ELO, statistiques, amis et historique restent intacts.

export class GoogleLinkRequiredError extends Error {
    constructor(public email: string, public pendingCredential: ReturnType<typeof GoogleAuthProvider.credentialFromError>) {
        super('Un compte existe déjà avec cette adresse. Saisis ton mot de passe pour lier ton compte Google.');
        this.name = 'GoogleLinkRequiredError';
    }
}

/** Résultat d'une connexion : le profil s'il existe, ou l'obligation de choisir un pseudo. */
export interface SignInOutcome {
    user: User | null;
    /** Le compte est authentifié mais n'a pas de profil : il faut choisir un pseudo. */
    needsUsername: boolean;
    userId: string;
    email?: string;
}

/**
 * Connexion Google.
 *
 * @throws GoogleLinkRequiredError si l'adresse a déjà un compte mot de passe.
 *         L'appelant doit alors demander le mot de passe et appeler
 *         `linkGoogleToExistingAccount`.
 */
export async function signInWithGoogle(): Promise<SignInOutcome> {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    // On force le choix du compte : sinon Google reconnecte silencieusement le
    // dernier utilisé, ce qui est déroutant sur un téléphone partagé au bar.
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
        const result = await signInWithPopup(auth, provider);
        return resolveProfile(result.user);
    } catch (err: unknown) {
        const error = err as { code?: string; customData?: { email?: string } };
        if (error?.code === 'auth/account-exists-with-different-credential') {
            throw new GoogleLinkRequiredError(
                error.customData?.email ?? '',
                GoogleAuthProvider.credentialFromError(err as never)
            );
        }
        throw err;
    }
}

/**
 * Rattache Google à un compte email/mot de passe existant.
 *
 * Le mot de passe n'est demandé qu'une fois : après ça, le joueur se connecte
 * avec Google et ne le ressaisit plus jamais. L'UID ne change pas.
 */
export async function linkGoogleToExistingAccount(
    email: string,
    password: string,
    pendingCredential: ReturnType<typeof GoogleAuthProvider.credentialFromError>
): Promise<SignInOutcome> {
    const auth = getFirebaseAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (pendingCredential) {
        await linkWithCredential(result.user, pendingCredential);
    }
    return resolveProfile(result.user);
}

/**
 * Le compte authentifié a-t-il un profil Firestore ?
 *
 * Répond aussi au bug des inscriptions ratées (chantier 9.8) : deux comptes de
 * février ont un compte Auth mais aucun document, et l'app leur est
 * inutilisable. Ils tomberont désormais sur l'écran de choix de pseudo.
 */
export async function resolveProfile(firebaseUser: FirebaseUser): Promise<SignInOutcome> {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (snap.exists()) {
        return {
            user: snap.data() as User,
            needsUsername: false,
            userId: firebaseUser.uid,
            email: firebaseUser.email ?? undefined,
        };
    }

    return {
        user: null,
        needsUsername: true,
        userId: firebaseUser.uid,
        email: firebaseUser.email ?? undefined,
    };
}

/**
 * Termine la création d'un compte : le joueur choisit son pseudo.
 *
 * Sert à trois cas d'un seul geste :
 *   1. nouveau compte Google (Google ne fournit pas de pseudo)
 *   2. réparation d'une inscription interrompue (chantier 9.8)
 *   3. tout futur compte sans document
 */
export async function completeProfile(username: string): Promise<User> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Aucun compte connecté');

    const trimmed = username.trim();
    if (trimmed.length < 2) throw new Error('Le pseudo doit faire au moins 2 caractères');
    if (trimmed.length > 25) throw new Error('Le pseudo ne peut pas dépasser 25 caractères');

    const available = await checkUsernameAvailable(trimmed, currentUser.uid);
    if (!available) throw new Error('Ce pseudo est déjà pris');

    await updateProfile(currentUser, { displayName: trimmed });
    return createUserDocument(currentUser.uid, trimmed, currentUser.email ?? undefined);
}
