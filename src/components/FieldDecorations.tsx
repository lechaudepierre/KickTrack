/**
 * Décor de terrain — marquage et accents géométriques.
 *
 * Migré des classes utilitaires Tailwind vers un module CSS (chantier 5.4).
 * Les couleurs et les arrondis viennent des tokens.
 */

import styles from './FieldDecorations.module.css';

export function FieldLines() {
    return (
        <div className={styles.fieldLines}>
            {/* Les lignes droites et diagonales ont été RETIRÉES (21/08).
                Elles s'appuyaient sur une classe `.field-line` qui n'a jamais
                existé dans le CSS : elles ne rendaient donc rien depuis
                toujours. En les migrant, je les avais rendues visibles pour la
                première fois — et le terrain devenait chargé.
                Seuls le rond central et les arcs de coin étaient réellement
                affichés : eux seuls restent. */}

            {/* Rond central */}
            <div className={`${styles.circle} ${styles.centerCircle}`} />

            {/* Arcs de coin */}
            <div className={`${styles.circle} ${styles.cornerArc} ${styles.cornerTopLeft}`} />
            <div className={`${styles.circle} ${styles.cornerArc} ${styles.cornerTopRight}`} />
            <div className={`${styles.circle} ${styles.cornerArc} ${styles.cornerBottomLeft}`} />
            <div className={`${styles.circle} ${styles.cornerArc} ${styles.cornerBottomRight}`} />
        </div>
    );
}

export function FieldBackground() {
    return (
        <div className={styles.fieldBackground}>
            <div className={styles.geometricAccentTop} />
            <div className={styles.geometricAccentBottom} />
            <FieldLines />
        </div>
    );
}
