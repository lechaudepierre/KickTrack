import {
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    Timestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { Announcement, AnnouncementType } from '@/types';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

export async function getAnnouncements(): Promise<Announcement[]> {
    const db = getFirebaseDb();
    const q = query(
        collection(db, ANNOUNCEMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            announcementId: d.id,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
        } as Announcement;
    });
}

export function countUnread(
    announcements: Announcement[],
    readIds: string[]
): number {
    const readSet = new Set(readIds);
    return announcements.filter(a => !readSet.has(a.announcementId)).length;
}

/**
 * Marque une annonce individuelle comme lue.
 * Utilise arrayUnion pour éviter les doublons et rester atomique.
 */
export async function markAnnouncementRead(userId: string, announcementId: string): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, 'users', userId), {
        readAnnouncementIds: arrayUnion(announcementId)
    });
}

export async function publishAnnouncement(params: {
    title: string;
    content: string;
    type: AnnouncementType;
    version?: string;
}): Promise<void> {
    const db = getFirebaseDb();
    const ref = doc(collection(db, ANNOUNCEMENTS_COLLECTION));
    const announcement: Announcement = {
        announcementId: ref.id,
        title: params.title,
        content: params.content,
        type: params.type,
        ...(params.version ? { version: params.version } : {}),
        createdAt: new Date(),
    };
    await setDoc(ref, announcement);
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
    const db = getFirebaseDb();
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        announcementId: snap.id,
        createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
    } as Announcement;
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcementId));
}
