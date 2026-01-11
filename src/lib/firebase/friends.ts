import {
    doc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    collection,
    query,
    where,
    limit
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { User } from '@/types';

const USERS_COLLECTION = 'users';

// Search users by username (for adding friends)
export async function searchUsersByUsername(searchQuery: string, currentUserId: string, limitCount: number = 10): Promise<User[]> {
    const db = getFirebaseDb();
    const q = searchQuery.toLowerCase().trim();

    if (!q) return [];

    // Get all users and filter client-side (Firestore doesn't support native contains search)
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const snapshot = await getDocs(usersQuery);

    const users = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(user =>
            user.userId !== currentUserId &&
            user.usernameLowercase.includes(q)
        )
        .slice(0, limitCount);

    return users;
}

// Send friend request
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    const db = getFirebaseDb();

    // Check if users exist
    const fromUserRef = doc(db, USERS_COLLECTION, fromUserId);
    const toUserRef = doc(db, USERS_COLLECTION, toUserId);

    const [fromUserSnap, toUserSnap] = await Promise.all([
        getDoc(fromUserRef),
        getDoc(toUserRef)
    ]);

    if (!fromUserSnap.exists() || !toUserSnap.exists()) {
        throw new Error('Utilisateur non trouvé');
    }

    const fromUser = fromUserSnap.data() as User;
    const toUser = toUserSnap.data() as User;

    // Check if already friends
    if (fromUser.friends?.includes(toUserId)) {
        throw new Error('Vous êtes déjà amis');
    }

    // Check if request already sent
    if (fromUser.friendRequestsSent?.includes(toUserId)) {
        throw new Error('Demande déjà envoyée');
    }

    // Check if there's a pending request from the other user
    if (fromUser.friendRequestsReceived?.includes(toUserId)) {
        // Auto-accept the request
        await acceptFriendRequest(fromUserId, toUserId);
        return;
    }

    // Add to sender's sent requests
    await updateDoc(fromUserRef, {
        friendRequestsSent: arrayUnion(toUserId)
    });

    // Add to receiver's received requests
    await updateDoc(toUserRef, {
        friendRequestsReceived: arrayUnion(fromUserId)
    });
}

// Accept friend request
export async function acceptFriendRequest(currentUserId: string, fromUserId: string): Promise<void> {
    const db = getFirebaseDb();

    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const fromUserRef = doc(db, USERS_COLLECTION, fromUserId);

    // Add each other as friends
    await Promise.all([
        updateDoc(currentUserRef, {
            friends: arrayUnion(fromUserId),
            friendRequestsReceived: arrayRemove(fromUserId)
        }),
        updateDoc(fromUserRef, {
            friends: arrayUnion(currentUserId),
            friendRequestsSent: arrayRemove(currentUserId)
        })
    ]);
}

// Reject friend request
export async function rejectFriendRequest(currentUserId: string, fromUserId: string): Promise<void> {
    const db = getFirebaseDb();

    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const fromUserRef = doc(db, USERS_COLLECTION, fromUserId);

    await Promise.all([
        updateDoc(currentUserRef, {
            friendRequestsReceived: arrayRemove(fromUserId)
        }),
        updateDoc(fromUserRef, {
            friendRequestsSent: arrayRemove(currentUserId)
        })
    ]);
}

// Remove friend
export async function removeFriend(currentUserId: string, friendUserId: string): Promise<void> {
    const db = getFirebaseDb();

    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    const friendUserRef = doc(db, USERS_COLLECTION, friendUserId);

    await Promise.all([
        updateDoc(currentUserRef, {
            friends: arrayRemove(friendUserId)
        }),
        updateDoc(friendUserRef, {
            friends: arrayRemove(currentUserId)
        })
    ]);
}

// Get friend requests with user details
export async function getFriendRequests(userId: string): Promise<User[]> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return [];

    const user = userSnap.data() as User;
    const requestIds = user.friendRequestsReceived || [];

    if (requestIds.length === 0) return [];

    // Fetch user details for each request
    const users: User[] = [];
    for (let i = 0; i < requestIds.length; i += 10) {
        const batch = requestIds.slice(i, i + 10);
        const q = query(collection(db, USERS_COLLECTION), where('userId', 'in', batch));
        const snapshot = await getDocs(q);
        users.push(...snapshot.docs.map(doc => doc.data() as User));
    }

    return users;
}

// Get friends list with user details
export async function getFriends(userId: string): Promise<User[]> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return [];

    const user = userSnap.data() as User;
    const friendIds = user.friends || [];

    if (friendIds.length === 0) return [];

    // Fetch user details for each friend
    const users: User[] = [];
    for (let i = 0; i < friendIds.length; i += 10) {
        const batch = friendIds.slice(i, i + 10);
        const q = query(collection(db, USERS_COLLECTION), where('userId', 'in', batch));
        const snapshot = await getDocs(q);
        users.push(...snapshot.docs.map(doc => doc.data() as User));
    }

    return users;
}

// Get friend count for a user
export async function getFriendRequestCount(userId: string): Promise<number> {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return 0;

    const user = userSnap.data() as User;
    return user.friendRequestsReceived?.length || 0;
}
