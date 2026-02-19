export type FeedbackType = 'bug' | 'improvement' | 'other';

export interface Feedback {
    feedbackId: string;
    userId: string;
    username: string;
    type: FeedbackType;
    message: string;
    // Context auto-collected
    page?: string;           // Page from which feedback was initiated
    device?: string;         // User agent (mobile/desktop)
    appVersion?: string;
    // Metadata
    status: 'new' | 'read' | 'resolved';
    createdAt: Date;
}
