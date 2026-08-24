'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './EloChangeDisplay.module.css';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface Props {
    isWinner: boolean;
    /**
     * Animation à jouer à la place de celle de victoire/défaite.
     * Sert aux célébrations plus fortes — une montée de grade ou un record
     * l'emportent sur la simple victoire.
     * UNE SEULE animation plein écran à la fois : deux superposées, c'est du bruit.
     */
    override?: string | null;
}

export default function EloChangeDisplay({ isWinner, override }: Props) {
    const [animationData, setAnimationData] = useState<object | null>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const file = override ?? (isWinner ? '/animations/fireworks.json' : '/animations/smoke.json');
        fetch(file)
            .then(r => r.json())
            .then(setAnimationData)
            .catch(() => setAnimationData(null));
    }, [isWinner, override]);

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
            <Lottie animationData={animationData}
                loop={false}
                className={styles.lottieFullscreen}
            />
        </div>
    );
}
