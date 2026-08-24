/**
 * RankProgressBar — étage 2 du design system.
 *
 * Progression vers le grade suivant. Les paliers d'ELO existent dans
 * `rankUtils` depuis toujours et n'étaient affichés nulle part : un joueur ne
 * pouvait pas savoir ce qui le séparait du grade suivant, alors que c'est
 * l'information qui donne envie de relancer une partie.
 *
 * Utilisé sur le profil ET sur l'écran de résultats. C'est pour ça qu'il vit
 * ici et non dans `components/profile` : il n'est plus propre au profil.
 *
 * Ne lit QUE des tokens.
 */

'use client';

import { getRankProgress } from '@/lib/utils/rankUtils';
import styles from './RankProgressBar.module.css';

export default function RankProgressBar({ elo }: { elo?: number }) {
    const progress = getRankProgress(elo ?? 1000);
    const atTop = progress.next === null;

    return (
        <div className={styles.progress}>
            <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>
                    {atTop ? 'Palier maximum' : `Vers ${progress.next?.label} ${progress.next?.romanLevel}`}
                </span>
                {!atTop && (
                    <span className={styles.progressRemaining}>
                        {progress.pointsToNext} Elo
                    </span>
                )}
            </div>

            <div className={styles.track}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.ratio * 100)}
                aria-label={atTop ? 'Palier maximum atteint' : `Progression vers ${progress.next?.label}`}
            >
                <div className={`${styles.fill} ${atTop ? styles.fillMax : ''}`}
                    style={{ width: `${progress.ratio * 100}%` }}
                />
            </div>

            <div className={styles.milestones}>
                <span className={styles.milestone}>
                    <img src={progress.current.iconPath} alt="" className={styles.milestoneIcon} />
                    {progress.current.label} {progress.current.romanLevel}
                </span>

                {atTop ? (
                    <span className={styles.maxed}>Rien au-dessus</span>
                ) : (
                    <span className={styles.milestone}>
                        {progress.next?.label} {progress.next?.romanLevel}
                        <img src={progress.next?.iconPath} alt="" className={styles.milestoneIcon} />
                    </span>
                )}
            </div>
        </div>
    );
}
