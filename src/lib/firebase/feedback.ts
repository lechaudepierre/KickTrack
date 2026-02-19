import { collection, doc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from './config';
import { Feedback, FeedbackType } from '@/types';

const FEEDBACKS_COLLECTION = 'feedbacks';

export async function submitFeedback(params: {
    userId: string;
    username: string;
    type: FeedbackType;
    message: string;
    page?: string;
}): Promise<Feedback> {
    const db = getFirebaseDb();
    const feedbackRef = doc(collection(db, FEEDBACKS_COLLECTION));

    const feedback: Feedback = {
        feedbackId: feedbackRef.id,
        userId: params.userId,
        username: params.username,
        type: params.type,
        message: params.message,
        page: params.page,
        device: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        status: 'new',
        createdAt: new Date(),
    };

    await setDoc(feedbackRef, feedback);
    return feedback;
}
