'use client';

import { useState, useEffect } from 'react';
import { toMillis } from '@/lib/game/dates';
import styles from './GameTimer.module.css';

interface GameTimerProps {
    startedAt: Date;
    isRunning?: boolean;
}

export default function GameTimer({ startedAt, isRunning = true }: GameTimerProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isRunning || !startedAt) return;

        const debut = toMillis(startedAt);
        if (debut === 0) return;

        const updateTimer = () => setElapsed(Math.floor((Date.now() - debut) / 1000));

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startedAt, isRunning]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
        <div className={styles.container}>
            <div className={styles.dot} />
            <span className={styles.time}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
}
