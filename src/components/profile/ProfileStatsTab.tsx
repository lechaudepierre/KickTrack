/**
 * Onglet Statistiques du profil.
 *
 * Courbe d'ELO, gamelles, buts flash, rôles, métriques détaillées.
 * Extrait de `ProfileContent` lors de la refonte du profil (chantier 9.3).
 */

'use client';

import {
    ChartBarIcon,
    FireIcon,
    InformationCircleIcon,
    TrophyIcon,
} from '@heroicons/react/24/outline';
import type { AdvancedStats } from '@/lib/utils/statsCalculator';
import { EloChart } from './EloChart';
import styles from './ProfileContent.module.css';

interface ProfileStatsTabProps {
    advancedStats: AdvancedStats;
    /** Filtre de format actif, pour adapter les sections propres au 2v2. */
    modeFilter: '1v1' | '2v2' | 'all';
    /** Ouvre l'explication des remontadas. */
    onShowRemontadaInfo: () => void;
}

export default function ProfileStatsTab({ advancedStats, modeFilter, onShowRemontadaInfo }: ProfileStatsTabProps) {
    return (
        <>
                    {/* Elo History Chart */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <ChartBarIcon width={20} height={20} />
                            Évolution de l&apos;Elo
                        </h3>
                        <div className={styles.chartCard}>
                            <EloChart data={advancedStats.eloHistory} />
                        </div>
                    </div>


                    {/* Gamelles Section */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <FireIcon width={20} height={20} />
                            Gamelles
                        </h3>
                        <div className={styles.gamellesGrid}>
                            <div className={styles.gamelleCard}>
                                <p className={styles.gamelleValue}>{advancedStats.gamelleStats.total}</p>
                                <p className={styles.gamelleLabel}>Total</p>
                                <p className={styles.gamelleSub}>{Math.round(advancedStats.gamelleStats.totalPercentage)}% des matchs</p>
                            </div>
                            <div className={styles.gamelleCard}>
                                <p className={styles.gamelleValue}>{advancedStats.gamelleStats.rentrantes}</p>
                                <p className={styles.gamelleLabel}>Rentrantes</p>
                                <p className={styles.gamelleSub}>{Math.round(advancedStats.gamelleStats.rentrantesPercentage)}% des matchs</p>
                            </div>
                        </div>
                    </div>

                    {/* Flash Goals Section */}
                    {advancedStats.flashStats.total > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <FireIcon width={20} height={20} />
                                Buts Flash
                            </h3>
                            <div className={styles.gamellesGrid}>
                                <div className={styles.gamelleCard}>
                                    <p className={styles.gamelleValue}>{advancedStats.flashStats.total}</p>
                                    <p className={styles.gamelleLabel}>Total</p>
                                    <p className={styles.gamelleSub}>{Math.round(advancedStats.flashStats.totalPercentage)}% des matchs</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Roles Section (Only if 2v2 is possible) */}
                    {modeFilter !== '1v1' && (advancedStats.roleStats.attack.games > 0 || advancedStats.roleStats.defense.games > 0) && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>
                                <TrophyIcon width={20} height={20} />
                                Performance par Rôle (2v2)
                            </h3>
                            <div className={styles.rolesGrid}>
                                <div className={styles.roleCard}>
                                    <p className={styles.roleTitle}>Attaque</p>
                                    <p className={styles.roleValue}>{Math.round(advancedStats.roleStats.attack.winRate * 100)}%</p>
                                    <p className={styles.roleSub}>{advancedStats.roleStats.attack.games} matchs</p>
                                </div>
                                <div className={styles.roleCard}>
                                    <p className={styles.roleTitle}>Défense</p>
                                    <p className={styles.roleValue}>{Math.round(advancedStats.roleStats.defense.winRate * 100)}%</p>
                                    <p className={styles.roleSub}>{advancedStats.roleStats.defense.games} matchs</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Metrics */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <ChartBarIcon width={20} height={20} />
                            Métriques Détaillées
                        </h3>
                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Buts / Match</span>
                                <span className={styles.detailValue}>{advancedStats.goalsPerGame.overall.toFixed(1)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Clean Sheets</span>
                                <span className={styles.detailValue}>{advancedStats.cleanSheets}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Remontadas</span>
                                <span className={styles.detailValue}>{advancedStats.comebacks}</span>
                                <button onClick={() => onShowRemontadaInfo()} className={styles.infoBtn}>
                                    <InformationCircleIcon width={16} height={16} />
                                </button>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Meilleure Série</span>
                                <span className={styles.detailValue}>{advancedStats.winStreak} V</span>
                            </div>
                        </div>
                    </div>

        </>
    );
}
