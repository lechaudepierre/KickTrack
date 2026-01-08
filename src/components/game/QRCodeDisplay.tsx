'use client';

import { useEffect, useState } from 'react';
import { getRemainingTime, formatTime } from '@/lib/utils/code-generator';
import styles from './QRCodeDisplay.module.css';

interface QRCodeDisplayProps {
    qrData: string;
    pinCode: string;
    createdAt: Date;
    expirationMinutes?: number;
    onExpired?: () => void;
}

export default function QRCodeDisplay({
    pinCode,
    createdAt,
    expirationMinutes = 5,
    onExpired
}: QRCodeDisplayProps) {
    const [remainingTime, setRemainingTime] = useState(() =>
        getRemainingTime(createdAt, expirationMinutes)
    );

    useEffect(() => {
        const interval = setInterval(() => {
            const time = getRemainingTime(createdAt, expirationMinutes);
            setRemainingTime(time);

            if (time <= 0) {
                clearInterval(interval);
                onExpired?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [createdAt, expirationMinutes, onExpired]);

    const isLowTime = remainingTime < 60;

    return (
        <div className={styles.container}>
            {/* PIN Code */}
            <div className={styles.pinContainer}>
                <p className={styles.pinLabel}>Entrez ce code pour rejoindre</p>
                <div className={styles.pinBox}>
                    <p className={styles.pinCode}>
                        {pinCode}
                    </p>
                </div>
            </div>

            {/* Timer */}
            <div className={`${styles.timer} ${isLowTime ? styles.timerLow : styles.timerNormal}`}>
                <div className={`${styles.timerDot} ${isLowTime ? styles.timerDotLow : styles.timerDotNormal}`} />
                <span className={`${styles.timerText} ${isLowTime ? styles.timerTextLow : styles.timerTextNormal}`}>
                    {formatTime(remainingTime)}
                </span>
                <span className={styles.timerLabel}>restantes</span>
            </div>
        </div>
    );
}
