/**
 * Évolution d'un joueur au classement sur la semaine écoulée.
 *
 * Reconstituée depuis `stats.history`, qui conserve l'ELO de fin de journée :
 * aucun historique de classement n'a eu besoin d'être stocké, et l'affichage
 * fonctionne rétroactivement sur les comptes existants.
 */

'use client';

import type { Movement } from '@/lib/game/ranking';
import styles from './RankMovement.module.css';

/** Petite flèche pleine, dessinée plutôt qu'importée : elle doit être minuscule. */
function Arrow({ up }: { up: boolean }) {
    return (
        <svg className={styles.arrow} viewBox="0 0 10 10" aria-hidden="true">
            <path
                d={up ? 'M5 1 L9 7 L1 7 Z' : 'M5 9 L1 3 L9 3 Z'}
                fill="currentColor"
            />
        </svg>
    );
}

export default function RankMovement({ movement }: { movement?: Movement }) {
    if (!movement) return null;

    switch (movement.kind) {
        case 'up':
            return (
                <span className={`${styles.movement} ${styles.up}`} title={`${movement.places} place(s) gagnée(s) cette semaine`}>
                    <Arrow up />{movement.places}
                </span>
            );
        case 'down':
            return (
                <span className={`${styles.movement} ${styles.down}`} title={`${movement.places} place(s) perdue(s) cette semaine`}>
                    <Arrow up={false} />{movement.places}
                </span>
            );
        case 'new':
            return <span className={`${styles.movement} ${styles.new}`} title="Nouveau au classement">NEW</span>;
        default:
            return <span className={`${styles.movement} ${styles.same}`} title="Même place que la semaine dernière">=</span>;
    }
}
