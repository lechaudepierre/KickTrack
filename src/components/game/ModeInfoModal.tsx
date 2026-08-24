/**
 * Fiche des règles d'un mode de jeu.
 *
 * Composant générique : il affiche `mode.explained`, quel que soit le mode.
 * Ajouter un mode ou une règle à la config le fait apparaître ici sans
 * toucher à ce fichier.
 *
 * Deux exports :
 *   ModeInfoButton  le petit bouton d'information, à poser sur une carte
 *   ModeInfoModal   la fiche elle-même
 */

'use client';

import { useEffect } from 'react';
import type { GameMode } from '@/lib/gamemodes/types';
import styles from './ModeInfoModal.module.css';

export function ModeInfoButton({ onClick, modeName }: { onClick: () => void; modeName: string }) {
    return (
        <button type="button"
            className={styles.infoButton}
            aria-label={`Règles du mode ${modeName}`}
            onClick={(e) => {
                // Sans ça, cliquer sur l'information sélectionnerait aussi le mode.
                e.stopPropagation();
                onClick();
            }}
        >
            i
        </button>
    );
}

interface ModeInfoModalProps {
    mode: GameMode | null;
    onClose: () => void;
}

export default function ModeInfoModal({ mode, onClose }: ModeInfoModalProps) {
    useEffect(() => {
        if (!mode) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode, onClose]);

    if (!mode) return null;

    return (
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Mode {mode.name}</h2>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
                        &times;
                    </button>
                </div>

                <p className={styles.description}>{mode.description}</p>

                {mode.explained.length === 0 ? (
                    <p className={styles.empty}>Aucune règle particulière.</p>
                ) : (
                    <div className={styles.rules}>
                        {mode.explained.map(rule => (
                            <div key={rule.title} className={styles.rule}>
                                <span className={styles.ruleTitle}>{rule.title}</span>
                                <span className={styles.ruleDetail}>{rule.detail}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
