'use client';

/**
 * « Saison 0 — Master, 7ᵉ » sur le profil — chantier 3.5.
 *
 * La contrepartie visible du reset d'ELO : le joueur perd ses points, mais
 * garde une trace de ce qu'il a fait. Sans ça, la clôture se vit comme une
 * punition sèche.
 *
 * N'affiche RIEN tant qu'aucune saison n'est close — c'est l'état actuel, et
 * ça doit rester silencieux plutôt que d'annoncer une section vide.
 */

import { useSeasonHistory } from '@/lib/firebase/useSeasonHistory';
import { RANK_LABELS, type RankType } from '@/lib/utils/rankUtils';
import styles from './SeasonHistory.module.css';

interface SeasonHistoryProps {
    userId: string | undefined;
}

/** « 1ᵉʳ », « 2ᵉ », « 7ᵉ » — le premier se dit autrement que les autres. */
function ordinal(n: number): string {
    return n === 1 ? '1ᵉʳ' : `${n}ᵉ`;
}

export default function SeasonHistory({ userId }: SeasonHistoryProps) {
    const saisons = useSeasonHistory(userId);

    // `null` = pas encore lu, `[]` = aucune saison close. Les deux se taisent.
    if (!saisons || saisons.length === 0) return null;

    return (
        <section className={styles.bloc}>
            <h2 className={styles.titre}>Saisons passées</h2>
            <ul className={styles.liste}>
                {saisons.map(s => (
                    <li key={s.seasonId} className={styles.ligne}>
                        <span className={styles.saison}>{s.label}</span>
                        <span className={styles.detail}>
                            {RANK_LABELS[s.peakGrade as RankType] ?? s.peakGrade}
                            {' · '}
                            {ordinal(s.rank)}
                            {' · '}
                            {s.elo} Elo
                        </span>
                        {s.games > 0 && (
                            <span className={styles.parties}>
                                {s.games} partie{s.games > 1 ? 's' : ''}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
