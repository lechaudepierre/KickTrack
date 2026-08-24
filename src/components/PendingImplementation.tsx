'use client';

import Link from 'next/link';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FieldBackground } from './FieldDecorations';
import styles from './PendingImplementation.module.css';

interface PendingImplementationProps {
    featureName: string;
    description?: string;
}

export default function PendingImplementation({
    featureName,
    description = "Cette fonctionnalité est en cours de développement et sera bientôt disponible."
}: PendingImplementationProps) {
    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
            <FieldBackground />

            <div className={styles.container}>
                {/* Icon */}
                <div className={styles.iconSection}>
                    <div className={styles.iconWrapper}>
                        <div className={styles.iconShadow} />
                        <div className={styles.iconBox}>
                            <ClockIcon className={styles.icon} />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className={styles.title}>
                    {featureName}
                </h1>

                {/* Status Badge */}
                <div className={styles.statusBadge}>
                    <div className={styles.statusDot} />
                    <span className={styles.statusText}>
                        En développement
                    </span>
                </div>

                {/* Description */}
                <div className={styles.descriptionCard}>
                    <p className={styles.description}>
                        {description}
                    </p>
                </div>

                {/* Back Button */}
                <div className={styles.backButton}>
                    {/* Le bouton est rendu ici comme un lien : un <button> dans
                        un <a> est du HTML invalide. Même apparence, bon élément. */}
                    <Link href="/dashboard" className={styles.backLink}>
                        <ArrowLeftIcon width={20} height={20} />
                        <span>Retour au tableau de bord</span>
                    </Link>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.footerDivider} />
                    <p className={styles.footerText}>
                        Coming Soon
                    </p>
                    <div className={styles.footerDivider} />
                </div>
            </div>
        </div>
    );
}
