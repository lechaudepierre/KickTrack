'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { Button } from '@/components/ui';
import {
    PlusCircleIcon,
    QrCodeIcon,
    ChartBarIcon,
    TrophyIcon,
    MapPinIcon,
    ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logout, initialize } = useAuthStore();

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 p-6 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        ⚽ KickTrack
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">{user?.username || 'Joueur'}</h2>
                            <p className="text-slate-400 text-sm">
                                {user?.stats.totalGames || 0} parties jouées
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                            <p className="text-2xl font-bold text-emerald-400">{user?.stats.wins || 0}</p>
                            <p className="text-xs text-slate-500">Victoires</p>
                        </div>
                        <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                            <p className="text-2xl font-bold text-red-400">{user?.stats.losses || 0}</p>
                            <p className="text-xs text-slate-500">Défaites</p>
                        </div>
                        <div className="text-center p-3 bg-slate-900/50 rounded-xl">
                            <p className="text-2xl font-bold text-teal-400">
                                {user?.stats.winRate ? `${Math.round(user.stats.winRate * 100)}%` : '0%'}
                            </p>
                            <p className="text-xs text-slate-500">Ratio</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                        Actions rapides
                    </h3>

                    <Link href="/game/new" className="block">
                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl hover:border-emerald-500/50 transition-all group">
                            <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                                <PlusCircleIcon className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">Nouvelle Partie</p>
                                <p className="text-sm text-slate-400">Créer une partie et inviter des joueurs</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/game/join" className="block">
                        <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all group">
                            <div className="p-3 bg-slate-700/50 rounded-xl group-hover:bg-slate-700 transition-colors">
                                <QrCodeIcon className="h-6 w-6 text-slate-300" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">Rejoindre</p>
                                <p className="text-sm text-slate-400">Scanner un QR code ou entrer un code</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/profile" className="block">
                        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all text-center">
                            <ChartBarIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                            <p className="font-medium text-white text-sm">Mes Stats</p>
                        </div>
                    </Link>

                    <Link href="/leaderboard" className="block">
                        <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all text-center">
                            <TrophyIcon className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                            <p className="font-medium text-white text-sm">Classement</p>
                        </div>
                    </Link>

                    <Link href="/venues" className="block col-span-2">
                        <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                            <MapPinIcon className="h-6 w-6 text-rose-400" />
                            <p className="font-medium text-white">Lieux de jeu</p>
                        </div>
                    </Link>
                </div>

                {/* Recent Activity */}
                <div className="mt-8">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                        Dernières parties
                    </h3>
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 text-center">
                        <p className="text-slate-500">Aucune partie récente</p>
                        <Button variant="ghost" size="sm" className="mt-2">
                            <Link href="/game/new">Jouer ma première partie</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
