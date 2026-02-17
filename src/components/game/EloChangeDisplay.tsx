'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './EloChangeDisplay.module.css';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface Props {
    isWinner: boolean;
}

export default function EloChangeDisplay({ isWinner }: Props) {
    const [animationData, setAnimationData] = useState<object | null>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const file = isWinner ? '/animations/fireworks.json' : '/animations/smoke.json';
        fetch(file)
            .then(r => r.json())
            .then(setAnimationData);
    }, [isWinner]);

    // Auto-hide after animation plays
    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    if (!visible || !animationData) return null;

    return (
        <div className={`${styles.overlay} ${!visible ? styles.overlayHidden : ''}`}>
            <Lottie
                animationData={animationData}
                loop={false}
                className={styles.lottieFullscreen}
            />
        </div>
    );
}
