/**
 * Étage 2 du design system — la librairie de composants.
 *
 * Règle : ces composants lisent UNIQUEMENT les tokens de `styles/variables.css`.
 * Aucune couleur, aucun arrondi, aucune ombre écrits en dur.
 *
 * Règle pour les pages (étage 3) : assembler ces composants, ne jamais
 * réécrire un bouton ou une carte à la main.
 */

export { default as Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';

export { default as Card } from './Card';
export type { CardVariant, CardPadding } from './Card';

export { default as Input } from './Input';

export { default as PageHeader } from './PageHeader';

export { default as RankProgressBar } from './RankProgressBar';

export { default as Badge } from './Badge';
export type { BadgeVariant } from './Badge';
