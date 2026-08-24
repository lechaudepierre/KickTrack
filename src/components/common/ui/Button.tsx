/**
 * Button — étage 2 du design system.
 *
 * Remplace les 28 définitions de bouton faites à la main dans les pages, ET
 * l'ancien Button en Tailwind (palette emerald/slate étrangère au reste de
 * l'app, utilisé dans 2 pages seulement).
 *
 * Ne lit QUE des tokens : aucune couleur, aucun arrondi, aucune ombre en dur.
 * Changer l'apparence de tous les boutons de l'app se fait dans variables.css.
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        children,
        variant = 'primary',
        size = 'md',
        isLoading = false,
        fullWidth = false,
        className = '',
        disabled,
        ...props
    },
    ref
) {
    return (
        <button ref={ref}
            disabled={disabled || isLoading}
            className={[
                styles.button,
                styles[variant],
                styles[size],
                fullWidth ? styles.fullWidth : '',
                className,
            ].filter(Boolean).join(' ')}
            {...props}
        >
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {children}
        </button>
    );
});

export default Button;
