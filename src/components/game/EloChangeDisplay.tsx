'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import styles from './EloChangeDisplay.module.css';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface EloChangeData {
    previousElo: number;
    newElo: number;
    eloChange: number;
    username: string;
}

interface Props {
    eloChanges: Record<string, EloChangeData>;
    winnerTeamIndex: number;
    teams: {
        players: { userId: string; username: string }[];
        color: string;
    }[];
}

export default function EloChangeDisplay({ eloChanges, winnerTeamIndex, teams }: Props) {
    const [fireworksData, setFireworksData] = useState<object | null>(null);
    const [smokeData, setSmokeData] = useState<object | null>(null);
    const [animatedElo, setAnimatedElo] = useState<Record<string, number>>({});
    const [showChange, setShowChange] = useState(false);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        // Load animation JSONs
        Promise.all([
            fetch('/animations/fireworks.json').then(r => r.json()),
            fetch('/animations/smoke.json').then(r => r.json())
        ]).then(([fw, sm]) => {
            setFireworksData(fw);
            setSmokeData(sm);
        });
    }, []);

    // Animate Elo counter
    useEffect(() => {
        if (!eloChanges || Object.keys(eloChanges).length === 0) return;

        // Initialize with previous Elo values
        const initial: Record<string, number> = {};
        Object.entries(eloChanges).forEach(([userId, data]) => {
            initial[userId] = data.previousElo;
        });
        setAnimatedElo(initial);

        // After a short delay, animate to new values
        const timer = setTimeout(() => {
            setShowChange(true);
            const startTime = Date.now();
            const duration = 1200;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);

                const current: Record<string, number> = {};
                Object.entries(eloChanges).forEach(([userId, data]) => {
                    current[userId] = Math.round(
                        data.previousElo + (data.newElo - data.previousElo) * eased
                    );
                });
                setAnimatedElo(current);

                if (progress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                }
            };

            animationFrameRef.current = requestAnimationFrame(animate);
        }, 600);

        return () => {
            clearTimeout(timer);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [eloChanges]);

    if (!eloChanges || Object.keys(eloChanges).length === 0) return null;

    const loserTeamIndex = 1 - winnerTeamIndex;

    const getPlayerTeamIndex = (userId: string): number => {
        if (teams[0].players.some(p => p.userId === userId)) return 0;
        return 1;
    };

    const winnerPlayers = Object.entries(eloChanges).filter(
        ([userId]) => getPlayerTeamIndex(userId) === winnerTeamIndex
    );
    const loserPlayers = Object.entries(eloChanges).filter(
        ([userId]) => getPlayerTeamIndex(userId) === loserTeamIndex
    );

    return (
        <div className={styles.eloSection}>
            <h3 className={styles.sectionTitle}>CLASSEMENT ELO</h3>

            <div className={styles.teamsContainer}>
                {/* Winners */}
                <div className={styles.teamBlock}>
                    <div className={styles.animationWrapper}>
                        {fireworksData && (
                            <Lottie
                                animationData={fireworksData}
                                loop={false}
                                className={styles.lottieAnimation}
                            />
                        )}
                    </div>
                    {winnerPlayers.map(([userId, data]) => (
                        <div key={userId} className={`${styles.eloCard} ${styles.eloCardWin}`}>
                            <div
                                className={styles.eloAvatar}
                                style={{
                                    backgroundColor: `var(--team-${teams[winnerTeamIndex].color})`,
                                    borderColor: '#333333'
                                }}
                            >
                                {data.username.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.eloInfo}>
                                <p className={styles.eloPlayerName}>{data.username}</p>
                                <div className={styles.eloValues}>
                                    <span className={styles.eloRating}>
                                        {animatedElo[userId] ?? data.previousElo}
                                    </span>
                                    {showChange && (
                                        <span className={`${styles.eloChange} ${styles.eloGain}`}>
                                            <ArrowTrendingUpIcon className={styles.eloArrow} />
                                            +{data.eloChange}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Losers */}
                <div className={styles.teamBlock}>
                    <div className={styles.animationWrapper}>
                        {smokeData && (
                            <Lottie
                                animationData={smokeData}
                                loop={false}
                                className={styles.lottieAnimation}
                            />
                        )}
                    </div>
                    {loserPlayers.map(([userId, data]) => (
                        <div key={userId} className={`${styles.eloCard} ${styles.eloCardLoss}`}>
                            <div
                                className={styles.eloAvatar}
                                style={{
                                    backgroundColor: `var(--team-${teams[loserTeamIndex].color})`,
                                    borderColor: '#333333'
                                }}
                            >
                                {data.username.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.eloInfo}>
                                <p className={styles.eloPlayerName}>{data.username}</p>
                                <div className={styles.eloValues}>
                                    <span className={styles.eloRating}>
                                        {animatedElo[userId] ?? data.previousElo}
                                    </span>
                                    {showChange && (
                                        <span className={`${styles.eloChange} ${styles.eloLoss}`}>
                                            <ArrowTrendingDownIcon className={styles.eloArrow} />
                                            {data.eloChange}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
