/**
 * PageHeader — étage 2 du design system.
 *
 * Une seule définition d'en-tête pour toutes les pages : bouton retour, titre,
 * sous-titre facultatif, action facultative à droite.
 *
 * Il existait auparavant 17 définitions de `.title` dans le projet, une par
 * page. Le titre du classement et celui du tableau de bord n'avaient ni la
 * même taille, ni le même traitement. C'est le genre d'écart qu'aucun
 * remplacement de CSS ne corrige durablement : il faut un composant unique.
 *
 * Ne lit QUE des tokens.
 */

'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    /**
     * Texte, ou fragment JSX quand une partie du titre doit être mise en avant
     * (le tableau de bord y met le nom de l'app avec son accent). Le
     * traitement typographique reste le même pour tous : c'est le composant
     * qui le porte, pas la page.
     */
    title: ReactNode;
    subtitle?: string;
    /**
     * Destination du bouton retour.
     * `false` masque le bouton, `undefined` revient à la page précédente,
     * une chaîne navigue vers cette route.
     */
    back?: string | false;
    /**
     * Comportement de retour propre à la page, quand revenir en arrière ne
     * suffit pas — par exemple annuler la session en cours avant de partir.
     *
     * Prend le pas sur `back`, mais le bouton garde SA POSITION ET SA TAILLE
     * standard : c'est tout l'intérêt. Une page ne doit jamais déplacer sa
     * flèche de retour parce que son comportement diffère.
     */
    onBack?: () => void;
    /** Contenu aligné à droite : un bouton d'action, un compteur… */
    action?: ReactNode;
}

export default function PageHeader({ title, subtitle, back, onBack, action }: PageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) return onBack();
        if (typeof back === 'string') return router.push(back);
        router.back();
    };

    return (
        <div className={styles.header}>
            {back !== false && (
                <button type="button"
                    className={styles.back}
                    onClick={handleBack}
                    aria-label="Retour"
                >
                    <ArrowLeftIcon width={22} height={22} />
                </button>
            )}

            <div className={styles.titleBlock}>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>

            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
