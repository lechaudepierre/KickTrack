import styles from './MatchPointFlames.module.css';

export default function MatchPointFlames() {
    return (
        <div className={styles.flamesContainer}>
            {/* Top flames */}
            <div className={styles.flameTop}>
                <svg viewBox="0 0 100 100" className={styles.flame}>
                    <path d="M50 10 Q45 30 50 50 Q55 30 50 10" fill="#FF6B35" />
                    <path d="M50 20 Q47 35 50 50 Q53 35 50 20" fill="#FFA500" />
                    <path d="M50 30 Q48 40 50 50 Q52 40 50 30" fill="#FFD700" />
                </svg>
            </div>

            {/* Bottom flames */}
            <div className={styles.flameBottom}>
                <svg viewBox="0 0 100 100" className={styles.flame}>
                    <path d="M50 90 Q45 70 50 50 Q55 70 50 90" fill="#FF6B35" />
                    <path d="M50 80 Q47 65 50 50 Q53 65 50 80" fill="#FFA500" />
                    <path d="M50 70 Q48 60 50 50 Q52 60 50 70" fill="#FFD700" />
                </svg>
            </div>

            {/* Left flames */}
            <div className={styles.flameLeft}>
                <svg viewBox="0 0 100 100" className={styles.flame}>
                    <path d="M10 50 Q30 45 50 50 Q30 55 10 50" fill="#FF6B35" />
                    <path d="M20 50 Q35 47 50 50 Q35 53 20 50" fill="#FFA500" />
                    <path d="M30 50 Q40 48 50 50 Q40 52 30 50" fill="#FFD700" />
                </svg>
            </div>

            {/* Right flames */}
            <div className={styles.flameRight}>
                <svg viewBox="0 0 100 100" className={styles.flame}>
                    <path d="M90 50 Q70 45 50 50 Q70 55 90 50" fill="#FF6B35" />
                    <path d="M80 50 Q65 47 50 50 Q65 53 80 50" fill="#FFA500" />
                    <path d="M70 50 Q60 48 50 50 Q60 52 70 50" fill="#FFD700" />
                </svg>
            </div>
        </div>
    );
}
