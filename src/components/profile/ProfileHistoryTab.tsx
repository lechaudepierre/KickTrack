/**
 * Onglet Historique du profil.
 *
 * Extrait de `ProfileContent` (929 lignes) lors de la refonte du profil.
 * Chaque onglet est désormais un fichier : c'est ce qui rend le découpage du
 * chantier 9.3 possible sans réécrire la page.
 *
 * Réutilise la feuille de style du profil : les onglets partagent la même
 * grammaire visuelle, il serait absurde de la dupliquer par fichier.
 */

'use client';

import { ClockIcon } from '@heroicons/react/24/outline';
import type { Game } from '@/types';
import {
    formatDate,
    getGameResult,
    getOpponentNames,
    getTeammateName,
    getEloChange,
    getScoreForUser,
} from './profileHelpers';
import styles from './ProfileContent.module.css';

interface ProfileHistoryTabProps {
    games: Game[];
    userId: string;
}

export default function ProfileHistoryTab({ games, userId }: ProfileHistoryTabProps) {
    return (
        <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                        <ClockIcon width={20} height={20} />
                        Dernières Parties
                    </h3>
                    {games.length === 0 ? (
                        <div className={styles.emptyState}>Aucune partie trouvée avec ces filtres</div>
                    ) : (
                        <div className={styles.gamesList}>
                            {games.map((game) => {
                                const result = getGameResult(game, userId);
                                const isWin = result === 'Victoire';
                                const teammate = getTeammateName(game, userId);
                                const eloChange = getEloChange(game, userId);
                                return (
                                    <div key={game.gameId} className={styles.gameCard}>
                                        <div className={styles.gameInfo}>
                                            <span className={`${styles.gameResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>{result}</span>
                                            <span className={styles.gameOpponent}>vs {getOpponentNames(game, userId)}</span>
                                            {teammate && (
                                                <span className={styles.gameTeammate}>avec {teammate}</span>
                                            )}
                                            <span className={styles.gameDate}>{formatDate(game.startedAt)}</span>
                                        </div>
                                    <div className={styles.gameRight}>
                                        <div className={styles.gameScore}>
                                            {getScoreForUser(game, userId)}
                                        </div>
                                        {eloChange !== null && (
                                            <span className={`${styles.gameElo} ${eloChange >= 0 ? styles.eloPositive : styles.eloNegative}`}>
                                                {eloChange >= 0 ? '+' : ''}{eloChange}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}
