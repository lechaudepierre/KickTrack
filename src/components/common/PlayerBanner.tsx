'use client';

import styles from './PlayerBanner.module.css';
import { resolveBanner } from '@/lib/collection/banner';
import { useCatalog } from '@/lib/collection/catalogClient';
import type { Equipped } from '@/types/collection';

interface PlayerBannerProps {
    username: string;
    bannerId?: string | null;
    /** Cosmétiques équipés (chantier 2.3). Prioritaire sur `bannerId`. */
    equipped?: Equipped | null;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
}

/**
 * Background-only banner skin.
 *
 * No banner  → transparent pass-through, zero layout change.
 * Banner active →
 *   • Background image fills the container (cover/crop).
 *   • Card size is driven by content exactly like a normal card.
 *   • ::before pseudo-element adds a very subtle overlay.
 *   • Golden border via .hasBanner.
 *   • Children render in normal flow — their layout (grid/flex) is unaffected.
 */
export default function PlayerBanner({
    username,
    bannerId,
    equipped,
    children,
    className,
    onClick,
    style,
}: PlayerBannerProps) {
    // Déclenche le chargement du catalogue et re-rend quand il arrive.
    useCatalog();
    const banner = resolveBanner(username, bannerId, equipped);

    if (!banner) {
        return (
            <div className={`${styles.wrap} ${className ?? ''}`} onClick={onClick} style={style}>
                {children}
            </div>
        );
    }

    return (
        <div className={`${styles.wrap} ${styles.hasBanner} ${className ?? ''}`}
            onClick={onClick}
            style={{
                ...style,
                backgroundImage: `url('${banner.path}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                ['--banner-text-color' as string]: banner.textColor,
                ['--banner-scrim-color' as string]: banner.scrimColor,
            }}
        >
            {children}
        </div>
    );
}
