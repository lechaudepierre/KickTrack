'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getRemainingTime, formatTime } from '@/lib/utils/code-generator';

interface QRCodeDisplayProps {
    qrData: string;
    pinCode: string;
    createdAt: Date;
    expirationMinutes?: number;
    onExpired?: () => void;
}

export default function QRCodeDisplay({
    qrData,
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
        <div className="flex flex-col items-center">
            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-xl">
                <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="M"
                    includeMargin={true}
                />
            </div>

            {/* PIN Code */}
            <div className="mt-6 text-center">
                <p className="text-slate-400 text-sm mb-2">Ou entrez ce code</p>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-8 py-4">
                    <p className="text-4xl font-mono font-bold tracking-[0.3em] text-emerald-400">
                        {pinCode}
                    </p>
                </div>
            </div>

            {/* Timer */}
            <div className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full ${isLowTime
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-slate-800/50 border border-slate-700'
                }`}>
                <div className={`w-2 h-2 rounded-full ${isLowTime ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                    }`} />
                <span className={`font-mono text-lg ${isLowTime ? 'text-red-400' : 'text-slate-300'
                    }`}>
                    {formatTime(remainingTime)}
                </span>
                <span className="text-slate-500 text-sm">restantes</span>
            </div>
        </div>
    );
}
