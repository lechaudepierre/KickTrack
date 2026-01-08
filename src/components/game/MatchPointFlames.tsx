import styles from './MatchPointFlames.module.css';

export default function MatchPointFlames() {
    // Many more flames to completely fill the border
    const topBottomCount = 12;
    const sideCount = 10;

    return (
        <div className={styles.flamesContainer}>
            {/* Top flames - pointing up */}
            <div className={styles.flamesTop}>
                {Array.from({ length: topBottomCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 40 60" className={styles.flame} style={{ animationDelay: `${i * 0.08}s` }}>
                        {/* Outer flame - red/orange */}
                        <path d="M20 5 Q10 15 10 30 Q10 45 20 55 Q30 45 30 30 Q30 15 20 5 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="3" strokeLinejoin="round" />
                        {/* Middle flame - orange */}
                        <path d="M20 12 Q14 20 14 32 Q14 42 20 48 Q26 42 26 32 Q26 20 20 12 Z"
                            fill="#FFA500" />
                        {/* Inner flame - yellow */}
                        <path d="M20 20 Q17 26 17 34 Q17 40 20 44 Q23 40 23 34 Q23 26 20 20 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Bottom flames - pointing down */}
            <div className={styles.flamesBottom}>
                {Array.from({ length: topBottomCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 40 60" className={styles.flame} style={{ animationDelay: `${i * 0.08}s` }}>
                        {/* Outer flame - red/orange */}
                        <path d="M20 55 Q10 45 10 30 Q10 15 20 5 Q30 15 30 30 Q30 45 20 55 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="3" strokeLinejoin="round" />
                        {/* Middle flame - orange */}
                        <path d="M20 48 Q14 38 14 28 Q14 18 20 12 Q26 18 26 28 Q26 38 20 48 Z"
                            fill="#FFA500" />
                        {/* Inner flame - yellow */}
                        <path d="M20 40 Q17 34 17 26 Q17 20 20 16 Q23 20 23 26 Q23 34 20 40 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Left flames - pointing right */}
            <div className={styles.flamesLeft}>
                {Array.from({ length: sideCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 40" className={styles.flame} style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* Outer flame - red/orange */}
                        <path d="M5 20 Q15 10 30 10 Q45 10 55 20 Q45 30 30 30 Q15 30 5 20 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="3" strokeLinejoin="round" />
                        {/* Middle flame - orange */}
                        <path d="M12 20 Q20 14 32 14 Q42 14 48 20 Q42 26 32 26 Q20 26 12 20 Z"
                            fill="#FFA500" />
                        {/* Inner flame - yellow */}
                        <path d="M20 20 Q26 17 34 17 Q40 17 44 20 Q40 23 34 23 Q26 23 20 20 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Right flames - pointing left */}
            <div className={styles.flamesRight}>
                {Array.from({ length: sideCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 40" className={styles.flame} style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* Outer flame - red/orange */}
                        <path d="M55 20 Q45 10 30 10 Q15 10 5 20 Q15 30 30 30 Q45 30 55 20 Z"
                            fill="#FF6B35" stroke="#333" strokeWidth="3" strokeLinejoin="round" />
                        {/* Middle flame - orange */}
                        <path d="M48 20 Q40 14 28 14 Q18 14 12 20 Q18 26 28 26 Q40 26 48 20 Z"
                            fill="#FFA500" />
                        {/* Inner flame - yellow */}
                        <path d="M40 20 Q34 17 26 17 Q20 17 16 20 Q20 23 26 23 Q34 23 40 20 Z"
                            fill="#FFD700" />
                    </svg>
                ))}
            </div>
        </div>
    );
}
