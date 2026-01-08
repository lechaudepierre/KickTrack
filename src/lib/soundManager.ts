/**
 * Sound Manager - Preload and manage game sounds
 */

class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== 'undefined') {
            this.preloadSounds();
        }
    }

    private preloadSounds() {
        const soundFiles = {
            'goal-normal': '/sounds/goal-normal.wav',
            'goal-gamelle': '/sounds/goal-gamelle.wav',
            'match-point': '/sounds/match-point.wav',
            'victory': '/sounds/victory.wav',
        };

        Object.entries(soundFiles).forEach(([key, path]) => {
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = 0.6; // Default volume
            this.sounds.set(key, audio);
        });
    }

    play(soundName: string, volume: number = 0.6): void {
        if (!this.enabled) return;

        const sound = this.sounds.get(soundName);
        if (sound) {
            // Clone the audio to allow overlapping plays
            const audioClone = sound.cloneNode() as HTMLAudioElement;
            audioClone.volume = volume;

            audioClone.play().catch(error => {
                console.warn(`Failed to play sound: ${soundName}`, error);
            });
        } else {
            console.warn(`Sound not found: ${soundName}`);
        }
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

// Singleton instance
export const soundManager = new SoundManager();
