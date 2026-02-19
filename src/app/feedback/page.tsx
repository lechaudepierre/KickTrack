'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { submitFeedback } from '@/lib/firebase/feedback';
import { FieldBackground } from '@/components/FieldDecorations';
import { FeedbackType } from '@/types';
import {
    ArrowLeftIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

const feedbackTypes: { type: FeedbackType; label: string; emoji: string }[] = [
    { type: 'bug', label: 'Bug', emoji: '🐛' },
    { type: 'improvement', label: 'Idée', emoji: '💡' },
    { type: 'other', label: 'Autre', emoji: '💬' },
];

const MAX_MESSAGE_LENGTH = 500;

export default function FeedbackPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [type, setType] = useState<FeedbackType>('improvement');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Tu dois être connecté pour envoyer un feedback');
            return;
        }

        if (!message.trim()) {
            setError('Écris un message avant d\'envoyer');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await submitFeedback({
                userId: user.userId,
                username: user.username,
                type,
                message: message.trim(),
                page: document.referrer || 'dashboard',
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting feedback:', err);
            setError('Erreur lors de l\'envoi. Réessaie !');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.container}>
                <FieldBackground />
                <div className={styles.contentWrapper}>
                    <div className={styles.successCard}>
                        <span className={styles.successEmoji}>🎉</span>
                        <h2 className={styles.successTitle}>Merci !</h2>
                        <p className={styles.successText}>
                            Ton retour a bien été envoyé.<br />
                            On prend en compte chaque message pour améliorer KickTracker.
                        </p>
                        <Link href="/dashboard" className={styles.successButton}>
                            Retour au tableau de bord
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeftIcon className={styles.backIcon} />
                        Tableau de bord
                    </Link>

                    <h1 className={styles.title}>
                        Ton <span className={styles.titleAccent}>Avis</span>
                    </h1>
                    <p className={styles.subtitle}>Aide-nous à améliorer KickTracker</p>
                </div>

                <div className={styles.formCard}>
                    {error && (
                        <div className={styles.errorBox}>
                            <ExclamationTriangleIcon className={styles.errorIcon} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Type de retour
                            </label>
                            <div className={styles.typeGrid}>
                                {feedbackTypes.map((ft) => (
                                    <button
                                        key={ft.type}
                                        type="button"
                                        onClick={() => setType(ft.type)}
                                        className={`${styles.typeButton} ${type === ft.type ? styles.typeButtonActive : styles.typeButtonInactive}`}
                                    >
                                        <span className={styles.typeEmoji}>{ft.emoji}</span>
                                        <span className={styles.typeLabel}>{ft.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                {type === 'bug' ? 'Décris le problème' : type === 'improvement' ? 'Ton idée' : 'Ton message'}
                            </label>
                            <textarea
                                placeholder={
                                    type === 'bug'
                                        ? 'Qu\'est-ce qui s\'est passé ? Sur quelle page ?'
                                        : type === 'improvement'
                                            ? 'Qu\'est-ce qu\'on pourrait ajouter ou améliorer ?'
                                            : 'Dis-nous tout...'
                                }
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                                className={styles.textarea}
                            />
                            <span className={styles.charCount}>
                                {message.length}/{MAX_MESSAGE_LENGTH}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !message.trim()}
                            className={styles.submitButton}
                        >
                            {isLoading ? 'Envoi...' : 'Envoyer mon avis'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
