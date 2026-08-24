'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getAnnouncements } from '@/lib/firebase/announcements';
import { Announcement } from '@/types';
import {
    ChatBubbleLeftEllipsisIcon,
    WrenchScrewdriverIcon,
    MegaphoneIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import styles from './page.module.css';
import { PageHeader } from '@/components/common/ui';

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
            } catch (err) {
                console.error('Error loading announcements:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const readIds = new Set(user?.readAnnouncementIds || []);

    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>

                <PageHeader title="Nouveautés" back={'/profile'} />

                {isLoading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingDot} />
                        <div className={styles.loadingDot} />
                        <div className={styles.loadingDot} />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MegaphoneIcon className={styles.emptyIcon} />
                        <p className={styles.emptyText}>Aucune nouveauté pour l&apos;instant</p>
                        <p className={styles.emptySubtext}>Revenez bientôt !</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {announcements.map((item) => {
                            const isUnread = !readIds.has(item.announcementId);
                            return (
                                <button key={item.announcementId}
                                    className={`${styles.card} ${isUnread ? styles.cardUnread : ''}`}
                                    onClick={() => router.push(`/notifications/${item.announcementId}`)}
                                >
                                    <div className={styles.cardLeft}>
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
                                            {isUnread && (
                                                <span className={styles.newBadge}>NEW</span>
                                            )}
                                        </div>
                                        <p className={styles.cardTitle}>{item.title}</p>
                                        <p className={styles.date}>{formatDate(item.createdAt)}</p>
                                    </div>
                                    <ChevronRightIcon className={styles.chevron} />
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={styles.feedbackSection}>
                    <p className={styles.feedbackPrompt}>Une idée ? Un bug à signaler ?</p>
                    <button onClick={() => router.push('/feedback')}
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
