import styles from './ProfileBanner.module.css';
import { getBannerPath, resolveBannerId } from '@/lib/utils/bannerUtils';

interface ProfileBannerProps {
    /** Username of the player — used to auto-assign creator banner */
    username: string;
    /** Optional explicit bannerId stored on the user profile */
    bannerId?: string | null;
    className?: string;
}

/**
 * Displays a profile banner at a fixed 4:1 aspect ratio.
 * Always shows the full image — never crops — just scales to available width.
 * Returns null if no banner applies.
 */
export default function ProfileBanner({ username, bannerId, className }: ProfileBannerProps) {
    const resolvedId = resolveBannerId(username, bannerId);
    const path = getBannerPath(resolvedId);

    if (!path) return null;

    return (
        <div className={`${styles.bannerWrapper} ${className ?? ''}`}>
            <img
                src={path}
                alt="Bannière de profil"
                className={styles.bannerImage}
                draggable={false}
            />
        </div>
    );
}
