'use client';

import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils/code-generator';
import styles from './GameTimer.module.css';

interface GameTimerProps {
    startedAt: Date;
    isRunning?: boolean;
}

export default function GameTimer({ startedAt, isRunning = true }: GameTimerProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isRunning || !startedAt) return;

        let start: Date;
        // Handle Firestore Timestamp (has toDate method)
        if (startedAt && typeof (startedAt as any).toDate === 'function') {
            start = (startedAt as any).toDate();
        } else {
            start = startedAt instanceof Date ? startedAt : new Date(startedAt);
        }

        if (isNaN(start.getTime())) {
            setElapsed(0);
            return;
        }

        const updateTimer = () => {
            const now = new Date();
            setElapsed(Math.floor((now.getTime() - start.getTime()) / 1000));
        };

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
