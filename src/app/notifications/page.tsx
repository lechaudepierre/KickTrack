'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getAnnouncements, markNotificationsRead } from '@/lib/firebase/announcements';
import { Announcement } from '@/types';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeftIcon,
    ChatBubbleLeftEllipsisIcon,
    WrenchScrewdriverIcon,
    MegaphoneIcon,
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function NotificationsPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAnnouncements();
                setAnnouncements(data);
                if (user?.userId) {
                    await markNotificationsRead(user.userId);
                }
            } catch (err) {
                console.error('Error loading announcements:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user?.userId]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    };

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>

                <div className={styles.header}>
                    <button onClick={() => router.push('/profile')} className={styles.backButton}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className={styles.title}>Nouveautés</h1>
                </div>

                {isLoading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingDot} />
                        <div className={styles.loadingDot} />
                        <div className={styles.loadingDot} />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MegaphoneIcon className={styles.emptyIcon} />
                        <p className={styles.emptyText}>Aucune nouveauté pour l'instant</p>
                        <p className={styles.emptySubtext}>Revenez bientôt !</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {announcements.map((item) => (
                            <div key={item.announcementId} className={styles.card}>
                                <div className={styles.cardMeta}>
                                    <div className={`${styles.typeBadge} ${item.type === 'patch' ? styles.typePatch : styles.typeNews}`}>
                                        {item.type === 'patch'
                                            ? <WrenchScrewdriverIcon className={styles.badgeIcon} />
                                            : <MegaphoneIcon className={styles.badgeIcon} />
                                        }
                                        <span>{item.type === 'patch' ? 'Mise à jour' : 'Annonce'}</span>
                                    </div>

                                    {item.version && (
                                        <span className={styles.version}>{item.version}</span>
                                    )}

                                    <span className={styles.date}>{formatDate(item.createdAt)}</span>
                                </div>

                                <h2 className={styles.cardTitle}>{item.title}</h2>

                                <div className={styles.markdownContent}>
                                    <ReactMarkdown>{item.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.feedbackSection}>
                    <p className={styles.feedbackPrompt}>Une idée ? Un bug à signaler ?</p>
                    <button
                        onClick={() => router.push('/feedback')}
                        className={styles.feedbackButton}
                    >
                        <ChatBubbleLeftEllipsisIcon className={styles.feedbackIcon} />
                        Donner ton avis
                    </button>
                </div>

            </div>
        </div>
    );
}
