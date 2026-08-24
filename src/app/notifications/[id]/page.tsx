'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAnnouncementById, markAnnouncementRead } from '@/lib/firebase/announcements';
import { Announcement } from '@/types';
import { useAuthStore } from '@/lib/stores/authStore';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeftIcon,
    WrenchScrewdriverIcon,
    MegaphoneIcon,
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

export default function AnnouncementDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const { setUser } = useAuthStore();

    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAnnouncementById(id);
                setAnnouncement(data);
                /*
                 * Marquer comme lu dès l'ouverture — atomique via arrayUnion.
                 *
                 * Le joueur est lu AU MOMENT DE L'APPEL, pas capturé par la
                 * fermeture. C'est ce qui permet à cet effet de ne dépendre que
                 * de `id` : dépendre de `user` le ferait boucler, puisqu'il
                 * modifie `user` lui-même à la ligne suivante.
                 */
                const courant = useAuthStore.getState().user;
                if (courant?.userId) {
                    await markAnnouncementRead(courant.userId, id);
                    // Mise à jour optimiste, pour que la liste suive tout de suite.
                    const dejaLues = courant.readAnnouncementIds || [];
                    if (!dejaLues.includes(id)) {
                        setUser({ ...courant, readAnnouncementIds: [...dejaLues, id] });
                    }
                }
            } catch (err) {
                console.error('Error loading announcement:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id, setUser]);

    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingDot} />
                    <div className={styles.loadingDot} />
                    <div className={styles.loadingDot} />
                </div>
            </div>
        );
    }

    if (!announcement) {
        return (
            <div className={styles.container}>
                <div className={styles.contentWrapper}>
                    <div className={styles.header}>
                        <button onClick={() => router.push('/notifications')} className={styles.backButton}>
                            <ArrowLeftIcon width={20} height={20} />
                        </button>
                    </div>
                    <p className={styles.notFound}>Annonce introuvable.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>

                <div className={styles.header}>
                    <button onClick={() => router.push('/notifications')} className={styles.backButton}>
                        <ArrowLeftIcon width={20} height={20} />
                    </button>
                    <div className={`${styles.typeBadge} ${announcement.type === 'patch' ? styles.typePatch : styles.typeNews}`}>
                        {announcement.type === 'patch'
                            ? <WrenchScrewdriverIcon className={styles.badgeIcon} />
                            : <MegaphoneIcon className={styles.badgeIcon} />
                        }
                        <span>{announcement.type === 'patch' ? 'Mise à jour' : 'Annonce'}</span>
                    </div>
                    {announcement.version && (
                        <span className={styles.version}>{announcement.version}</span>
                    )}
                </div>

                <div className={styles.titleBlock}>
                    <h1 className={styles.title}>{announcement.title}</h1>
                    <p className={styles.date}>{formatDate(announcement.createdAt)}</p>
                </div>

                <div className={styles.card}>
                    <div className={styles.markdownContent}>
                        <ReactMarkdown>{announcement.content}</ReactMarkdown>
                    </div>
                </div>

            </div>
        </div>
    );
}
