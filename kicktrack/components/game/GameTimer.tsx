'use client';

import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils/code-generator';

interface GameTimerProps {
    startedAt: Date;
    isRunning?: boolean;
}

export default function GameTimer({ startedAt, isRunning = true }: GameTimerProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isRunning) return;

        const start = startedAt instanceof Date ? startedAt : new Date(startedAt);

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
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-mono text-lg text-slate-300">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
}
