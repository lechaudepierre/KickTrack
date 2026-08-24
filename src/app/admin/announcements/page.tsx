'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    getAnnouncements,
    publishAnnouncement,
    deleteAnnouncement,
} from '@/lib/firebase/announcements';
import { isAdmin } from '@/lib/utils/adminUtils';
import { Announcement, AnnouncementType } from '@/types';
import ReactMarkdown from 'react-markdown';
import {
    WrenchScrewdriverIcon,
    MegaphoneIcon,
    TrashIcon,
    EyeIcon,
    PencilIcon,
} from '@heroicons/react/24/outline';
import styles from './page.module.css';
import { PageHeader } from '@/components/common/ui';

export default function AdminAnnouncementsPage() {
    const router = useRouter();
    const { user, initialize, isLoading: authLoading } = useAuthStore();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [version, setVersion] = useState('');
    const [type, setType] = useState<AnnouncementType>('patch');
    const [content, setContent] = useState('');

    useEffect(() => {
        const unsub = initialize();
        return () => { if (unsub) unsub(); };
    }, [initialize]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !isAdmin(user.email)) {
            router.replace('/profile');
            return;
        }
        loadAnnouncements();
        // `router` est stable dans Next : le lister ne provoque aucun rechargement.
    }, [user, authLoading, router]);

    const loadAnnouncements = async () => {
        try {
            const data = await getAnnouncements();
            setAnnouncements(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!title.trim() || !content.trim()) {
            setErrorMsg('Le titre et le contenu sont obligatoires.');
            return;
        }
        setIsPublishing(true);
        setErrorMsg('');
        try {
            await publishAnnouncement({
                title: title.trim(),
                content: content.trim(),
                type,
                version: version.trim() || undefined,
            });
            setTitle('');
            setVersion('');
            setContent('');
            setType('patch');
            setShowPreview(false);
            setSuccessMsg('Annonce publiée !');
            setTimeout(() => setSuccessMsg(''), 3000);
            await loadAnnouncements();
        } catch (err) {
            console.error(err);
            setErrorMsg('Erreur lors de la publication.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette annonce ?')) return;
        try {
            await deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.announcementId !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

    if (authLoading || (isLoading && !announcements.length)) {
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

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>

                {/* Header */}
                <PageHeader title="Admin — Annonces"
                    subtitle="Visible uniquement par les créateurs"
                    back={'/profile'}
                />

                {/* Form */}
                <div className={styles.formCard}>
                    <h2 className={styles.sectionTitle}>Nouvelle annonce</h2>

                    {/* Type */}
                    <div className={styles.typeRow}>
                        <button onClick={() => setType('patch')}
                            className={`${styles.typeBtn} ${type === 'patch' ? styles.typeBtnActive : ''}`}
                        >
                            <WrenchScrewdriverIcon width={16} height={16} />
                            Mise à jour
                        </button>
                        <button onClick={() => setType('news')}
                            className={`${styles.typeBtn} ${type === 'news' ? styles.typeBtnActiveNews : ''}`}
                        >
                            <MegaphoneIcon width={16} height={16} />
                            Annonce
                        </button>
                    </div>

                    {/* Title + Version */}
                    <div className={styles.row}>
                        <div className={styles.fieldGroup} style={{ flex: 2 }}>
                            <label className={styles.label}>Titre *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Fix ELO + Nouvelles bannières"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.fieldGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Version</label>
                            <input
                                type="text"
                                value={version}
                                onChange={e => setVersion(e.target.value)}
                                placeholder="v1.3.0"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    {/* Markdown editor / preview toggle */}
                    <div className={styles.fieldGroup}>
                        <div className={styles.editorHeader}>
                            <label className={styles.label}>Contenu (Markdown) *</label>
                            <button onClick={() => setShowPreview(p => !p)}
                                className={styles.previewToggle}
                            >
                                {showPreview
                                    ? <><PencilIcon width={16} height={16} /> Éditer</>
                                    : <><EyeIcon width={16} height={16} /> Aperçu</>
                                }
                            </button>
                        </div>

                        {showPreview ? (
                            <div className={styles.previewBox}>
                                {content.trim()
                                    ? <div className={styles.markdownContent}><ReactMarkdown>{content}</ReactMarkdown></div>
                                    : <p className={styles.emptyPreview}>Rien à afficher — écris du contenu d&apos;abord.</p>
                                }
                            </div>
                        ) : (
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder={`## Ce qui change\n\n**Correction ELO** — Le double calcul est maintenant bloqué.\n\n## Nouvelles fonctionnalités\n- Bannières créateurs\n- Page notifications\n\n![image](/announcements/screenshot.png)`}
                                className={styles.textarea}
                            />
                        )}
                    </div>

                    {errorMsg && <p className={styles.error}>{errorMsg}</p>}
                    {successMsg && <p className={styles.success}>{successMsg}</p>}

                    <button onClick={handlePublish}
                        disabled={isPublishing || !title.trim() || !content.trim()}
                        className={styles.publishBtn}
                    >
                        {isPublishing ? 'Publication...' : 'Publier l\'annonce'}
                    </button>
                </div>

                {/* Existing announcements */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Annonces publiées ({announcements.length})</h2>

                    {announcements.length === 0 ? (
                        <p className={styles.emptyText}>Aucune annonce pour l&apos;instant.</p>
                    ) : (
                        <div className={styles.list}>
                            {announcements.map(item => (
                                <div key={item.announcementId} className={styles.announcementRow}>
                                    <div className={styles.announcementInfo}>
                                        <div className={styles.announcementMeta}>
                                            <span className={`${styles.badge} ${item.type === 'patch' ? styles.badgePatch : styles.badgeNews}`}>
                                                {item.type === 'patch' ? 'Patch' : 'News'}
                                            </span>
                                            {item.version && <span className={styles.version}>{item.version}</span>}
                                            <span className={styles.date}>{formatDate(item.createdAt)}</span>
                                        </div>
                                        <p className={styles.announcementTitle}>{item.title}</p>
                                    </div>
                                    <button onClick={() => handleDelete(item.announcementId)}
                                        className={styles.deleteBtn}
                                        title="Supprimer"
                                    >
                                        <TrashIcon width={16} height={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
