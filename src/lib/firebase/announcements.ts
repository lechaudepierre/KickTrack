import {
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
    lastReadAt: Date | null | undefined
): number {
    if (!lastReadAt) return announcements.length;
    return announcements.filter(a => a.createdAt > lastReadAt).length;
}

export async function markNotificationsRead(userId: string): Promise<void> {
    const db = getFirebaseDb();
    await updateDoc(doc(db, 'users', userId), {
        lastReadNotificationsAt: new Date()
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

export async function deleteAnnouncement(announcementId: string): Promise<void> {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcementId));
}
