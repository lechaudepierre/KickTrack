/**
 * Affichage des gages — chantier 7.3.
 *
 * Un gage est purement déclaratif : l'app annonce, les joueurs exécutent .
 * D'où le choix d'un toast éphémère plutôt qu'une modale : ça ne bloque pas
 * la partie, ça ne demande pas de confirmation, ça n'a aucune conséquence
 * dans l'app. C'est un message, pas une action.
 */

'use client';

import { useEffect } from 'react';
import type { TriggeredMessage } from '@/lib/gamemodes/engine';
import styles from './GageToast.module.css';

interface GageToastProps {
    messages: TriggeredMessage[];
    onDismiss: () => void;
    /** Durée d'affichage. Assez long pour être lu à plusieurs autour du kicker. */
    durationMs?: number;
}

export default function GageToast({ messages, onDismiss, durationMs = 5000 }: GageToastProps) {
    useEffect(() => {
        if (messages.length === 0) return;
        const timer = setTimeout(onDismiss, durationMs);
        return () => clearTimeout(timer);
    }, [messages, onDismiss, durationMs]);

    if (messages.length === 0) return null;

    return (
        <div className={styles.stack} role="status" aria-live="polite">
            {messages.map(message => (
                <div key={message.ruleId} className={styles.toast}>
                    <span className={styles.rule}>{message.title}</span>
                    <span className={styles.text}>{message.text}</span>
                </div>
            ))}
        </div>
    );
}
