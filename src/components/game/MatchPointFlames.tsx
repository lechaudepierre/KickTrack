import styles from './MatchPointFlames.module.css';

export default function MatchPointFlames() {
    // More flames to fill the entire border
    const topBottomCount = 8;
    const sideCount = 6;

    return (
        <div className={styles.flamesContainer}>
            {/* Top flames */}
            <div className={styles.flamesTop}>
                {Array.from({ length: topBottomCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 80" className={styles.flame} style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* Outer flame - orange/red */}
                        <path d="M30 10 Q20 25 15 45 Q12 60 20 70 Q30 75 40 70 Q48 60 45 45 Q40 25 30 10 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="2.5" />
                        {/* Middle flame - orange */}
                        <path d="M30 20 Q24 32 22 48 Q20 58 30 65 Q40 58 38 48 Q36 32 30 20 Z"
                            fill="#FFA500" />
                        {/* Inner flame - yellow */}
                        <path d="M30 30 Q27 38 26 50 Q25 56 30 60 Q35 56 34 50 Q33 38 30 30 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Bottom flames */}
            <div className={styles.flamesBottom}>
                {Array.from({ length: topBottomCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 80" className={styles.flame} style={{ animationDelay: `${i * 0.1}s` }}>
                        <path d="M30 70 Q20 55 15 35 Q12 20 20 10 Q30 5 40 10 Q48 20 45 35 Q40 55 30 70 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="2.5" />
                        <path d="M30 60 Q24 48 22 32 Q20 22 30 15 Q40 22 38 32 Q36 48 30 60 Z"
                            fill="#FFA500" />
                        <path d="M30 50 Q27 42 26 30 Q25 24 30 20 Q35 24 34 30 Q33 42 30 50 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Left flames */}
            <div className={styles.flamesLeft}>
                {Array.from({ length: sideCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 80 60" className={styles.flame} style={{ animationDelay: `${i * 0.15}s` }}>
                        <path d="M10 30 Q25 20 45 15 Q60 12 70 20 Q75 30 70 40 Q60 48 45 45 Q25 40 10 30 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="2.5" />
                        <path d="M20 30 Q32 24 48 22 Q58 20 65 30 Q58 40 48 38 Q32 36 20 30 Z"
                            fill="#FFA500" />
                        <path d="M30 30 Q38 27 50 26 Q56 25 60 30 Q56 35 50 34 Q38 33 30 30 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Right flames */}
            <div className={styles.flamesRight}>
                {Array.from({ length: sideCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 80 60" className={styles.flame} style={{ animationDelay: `${i * 0.15}s` }}>
                        <path d="M70 30 Q55 20 35 15 Q20 12 10 20 Q5 30 10 40 Q20 48 35 45 Q55 40 70 30 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="2.5" />
                        <path d="M60 30 Q48 24 32 22 Q22 20 15 30 Q22 40 32 38 Q48 36 60 30 Z"
                            fill="#FFA500" />
                        <path d="M50 30 Q42 27 30 26 Q24 25 20 30 Q24 35 30 34 Q42 33 50 30 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>
        </div>
    );
}
