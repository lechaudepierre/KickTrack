/**
 * Card — étage 2 du design system.
 *
 * Remplace les 59 définitions de « card » écrites à la main dans les pages,
 * chacune avec ses propres valeurs de bordure, d'arrondi et d'ombre.
 *
 * Ne lit QUE des tokens.
 */

import { HTMLAttributes, forwardRef } from 'react';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'flat' | 'subtle' | 'highlighted';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: CardPadding;
    /** Rend la carte cliquable, avec le relief au survol. */
    interactive?: boolean;
    /** Rogne le contenu aux coins arrondis — pour une image pleine largeur. */
    clipped?: boolean;
}

const paddingClass: Record<CardPadding, string> = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
};

const variantClass: Record<CardVariant, string> = {
    default: '',
    flat: styles.flat,
    subtle: styles.subtle,
    highlighted: styles.highlighted,
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
    { children, variant = 'default', padding = 'md', interactive = false, clipped = false, className = '', ...props },
    ref
) {
    return (
        <div ref={ref}
            className={[
                styles.card,
                variantClass[variant],
                paddingClass[padding],
                interactive ? styles.interactive : '',
                clipped ? styles.clipped : '',
                className,
            ].filter(Boolean).join(' ')}
            {...props}
        >
            {children}
        </div>
    );
});

export default Card;
