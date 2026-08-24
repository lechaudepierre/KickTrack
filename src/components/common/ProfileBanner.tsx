'use client';

import styles from './ProfileBanner.module.css';
import { resolveBanner } from '@/lib/collection/banner';
import { useCatalog } from '@/lib/collection/catalogClient';
import type { Equipped } from '@/types/collection';

interface ProfileBannerProps {
    /** Username of the player — used to auto-assign creator banner */
    username: string;
    /** Optional explicit bannerId stored on the user profile */
    bannerId?: string | null;
    /** Cosmétiques équipés (chantier 2.3). Prioritaire sur `bannerId`. */
    equipped?: Equipped | null;
    className?: string;
}

/**
 * Displays a profile banner at a fixed 4:1 aspect ratio.
 * Always shows the full image — never crops — just scales to available width.
 * Returns null if no banner applies.
 */
export default function ProfileBanner({ username, bannerId, equipped, className }: ProfileBannerProps) {
    useCatalog();
    const banner = resolveBanner(username, bannerId, equipped);

    if (!banner) return null;

    return (
        <div className={`${styles.bannerWrapper} ${className ?? ''}`}>
            <img
                src={banner.path}
                alt={banner.name ?? 'Bannière de profil'}
                className={styles.bannerImage}
                draggable={false}
            />
        </div>
    );
}
