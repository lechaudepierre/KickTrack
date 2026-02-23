import { getRankInfo } from '@/lib/utils/rankUtils';
import styles from './RankAvatar.module.css';

interface RankAvatarProps {
    elo?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

/**
 * Displays the rank icon badge for a given ELO rating.
 * Replaces the first-letter circular avatar with a proper rank icon.
 */
export default function RankAvatar({ elo, size = 'md', className }: RankAvatarProps) {
    const rankInfo = getRankInfo(elo);

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={rankInfo.iconPath}
            alt={`${rankInfo.label} ${rankInfo.romanLevel}`}
            className={`${styles.rankAvatar} ${styles[size]} ${className || ''}`}
        />
    );
}
