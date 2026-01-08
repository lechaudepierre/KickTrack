import { useEffect, useCallback } from 'react';
import { soundManager } from '@/lib/soundManager';

export type SoundName = 'goal-normal' | 'goal-gamelle' | 'match-point' | 'victory';

interface UseSoundOptions {
    volume?: number;
    enabled?: boolean;
}

/**
 * Hook to play sounds in React components
 */
export function useSound(options: UseSoundOptions = {}) {
    const { volume = 0.6, enabled = true } = options;

    useEffect(() => {
        soundManager.setEnabled(enabled);
    }, [enabled]);

    const play = useCallback((soundName: SoundName) => {
        soundManager.play(soundName, volume);
    }, [volume]);

    return { play };
}
