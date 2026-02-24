export type AnnouncementType = 'patch' | 'news';

export interface Announcement {
    announcementId: string;
    version?: string;       // e.g. "v1.3.0" — optionnel pour les news
    title: string;
    content: string;        // Markdown
    type: AnnouncementType;
    createdAt: Date;
}
