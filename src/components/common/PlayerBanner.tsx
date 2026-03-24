'use client';

import styles from './PlayerBanner.module.css';
import { resolveBannerId, getBannerConfig, getBannerScrimColor } from '@/lib/utils/bannerUtils';

interface PlayerBannerProps {
    username: string;
    bannerId?: string | null;
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
    children,
    className,
    onClick,
    style,
}: PlayerBannerProps) {
    const resolvedId = resolveBannerId(username, bannerId);
    const config = getBannerConfig(resolvedId);

    if (!config) {
        return (
            <div className={`${styles.wrap} ${className ?? ''}`} onClick={onClick} style={style}>
                {children}
            </div>
        );
    }

    return (
        <div
            className={`${styles.wrap} ${styles.hasBanner} ${className ?? ''}`}
            onClick={onClick}
            style={{
                ...style,
                backgroundImage: `url('${config.path}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                ['--banner-text-color' as string]: config.textColor,
                ['--banner-scrim-color' as string]: getBannerScrimColor(config.textColor),
            }}
        >
            {children}
        </div>
    );
}
