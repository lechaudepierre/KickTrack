/**
 * Annonces de fin de partie — chantier « célébrations ».
 *
 * Affiche ce que `computeCelebrations` a trouvé : montée de grade, record
 * battu, série en cours, MVP.
 *
 * L'ordre EST la hiérarchie : le module de calcul trie du plus fort au plus
 * discret, ce composant ne fait que rendre. Il ne décide de rien.
 */

'use client';

import { useEffect } from 'react';
import type { Celebration } from '@/lib/game/celebrations';
import { useSound } from '@/hooks/useSound';
import styles from './CelebrationList.module.css';

export default function CelebrationList({ celebrations }: { celebrations: Celebration[] }) {
    const { play } = useSound({ volume: 0.7 });

    useEffect(() => {
        // Un seul son, celui de la célébration la plus forte. Les enchaîner
        // donnerait une cacophonie sur une partie qui cumule plusieurs exploits.
        const sound = celebrations.find(c => c.sound)?.sound;
        if (sound) play(sound);
    }, [celebrations, play]);

    if (celebrations.length === 0) return null;

    return (
        <div className={styles.list}>
            {celebrations.map(celebration => (
                <div key={celebration.kind}
                    className={[
                        styles.item,
                        styles[celebration.tier],
                        styles[celebration.kind] ?? '',
                    ].filter(Boolean).join(' ')}
                >
                    <div className={styles.text}>
                        <span className={styles.title}>{celebration.title}</span>
                        <span className={styles.detail}>{celebration.detail}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
