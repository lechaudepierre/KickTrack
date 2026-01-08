import styles from './MatchPointFlames.module.css';

export default function MatchPointFlames() {
    // Create multiple flames for each side
    const flameCount = 5;

    return (
        <div className={styles.flamesContainer}>
            {/* Top flames */}
            <div className={styles.flamesTop}>
                {Array.from({ length: flameCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 40 60" className={styles.flame} style={{ animationDelay: `${i * 0.15}s` }}>
                        <path d="M20 5 Q15 20 20 40 Q25 20 20 5 Z" fill="#FF6B35" stroke="#333" strokeWidth="2" />
                        <path d="M20 15 Q17 25 20 40 Q23 25 20 15 Z" fill="#FFA500" />
                        <path d="M20 25 Q18 30 20 40 Q22 30 20 25 Z" fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Bottom flames */}
            <div className={styles.flamesBottom}>
                {Array.from({ length: flameCount }).map((_, i) => (
                    <svg key={i} viewBox="0 0 40 60" className={styles.flame} style={{ animationDelay: `${i * 0.15}s` }}>
                        <path d="M20 55 Q15 40 20 20 Q25 40 20 55 Z" fill="#FF6B35" stroke="#333" strokeWidth="2" />
                        <path d="M20 45 Q17 35 20 20 Q23 35 20 45 Z" fill="#FFA500" />
                        <path d="M20 35 Q18 30 20 20 Q22 30 20 35 Z" fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Left flames */}
            <div className={styles.flamesLeft}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 40" className={styles.flame} style={{ animationDelay: `${i * 0.2}s` }}>
                        <path d="M5 20 Q20 15 40 20 Q20 25 5 20 Z" fill="#FF6B35" stroke="#333" strokeWidth="2" />
                        <path d="M15 20 Q25 17 40 20 Q25 23 15 20 Z" fill="#FFA500" />
                        <path d="M25 20 Q30 18 40 20 Q30 22 25 20 Z" fill="#FFD700" />
                    </svg>
                ))}
            </div>

            {/* Right flames */}
            <div className={styles.flamesRight}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 60 40" className={styles.flame} style={{ animationDelay: `${i * 0.2}s` }}>
                        <path d="M55 20 Q40 15 20 20 Q40 25 55 20 Z" fill="#FF6B35" stroke="#333" strokeWidth="2" />
                        <path d="M45 20 Q35 17 20 20 Q35 23 45 20 Z" fill="#FFA500" />
                        <path d="M35 20 Q30 18 20 20 Q30 22 35 20 Z" fill="#FFD700" />
                    </svg>
                ))}
            </div>
        </div>
    );
}
