/**
 * Badge — étage 2 du design system.
 *
 * Une seule définition de la pastille arrondie, écrite jusqu'ici tantôt en
 * `9999px`, tantôt en `999px`, tantôt via une variable selon les fichiers.
 *
 * Ne lit QUE des tokens.
 */

import { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'danger' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

export default function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
    return (
        <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')} {...props}>
            {children}
        </span>
    );
}
