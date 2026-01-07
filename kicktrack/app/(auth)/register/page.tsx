'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { registerComplete, registerQuick } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';

export default function RegisterPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [mode, setMode] = useState<'quick' | 'complete'>('quick');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleQuickRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setError('Le nom d\'utilisateur est requis');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const user = await registerQuick(username);
            setUser(user);
            router.push('/dashboard');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !email.trim() || !password.trim()) {
            setError('Tous les champs sont requis');
            return;
        }

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const user = await registerComplete(username, email, password);
            setUser(user);
            router.push('/dashboard');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        ⚽ KickTrack
                    </h1>
                    <p className="text-slate-400 mt-2">Créez votre compte</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-900/50 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setMode('quick')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'quick'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Rapide
                        </button>
                        <button
                            onClick={() => setMode('complete')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'complete'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Complet
                        </button>
                    </div>

                    {/* Mode descriptions */}
                    <div className="mb-6 p-3 bg-slate-900/50 rounded-xl">
                        {mode === 'quick' ? (
                            <p className="text-slate-400 text-sm">
                                🚀 <span className="text-emerald-400 font-medium">Inscription rapide</span> -
                                Commencez à jouer immédiatement avec juste un pseudo.
                                Vous pourrez sécuriser votre compte plus tard.
                            </p>
                        ) : (
                            <p className="text-slate-400 text-sm">
                                🔒 <span className="text-emerald-400 font-medium">Compte sécurisé</span> -
                                Créez un compte complet avec email et mot de passe
                                pour ne jamais perdre vos statistiques.
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {mode === 'quick' ? (
                        <form onSubmit={handleQuickRegister} className="space-y-4">
                            <Input
                                label="Nom d'utilisateur"
                                type="text"
                                placeholder="Votre pseudo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <Button type="submit" fullWidth isLoading={isLoading}>
                                Commencer à jouer
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleCompleteRegister} className="space-y-4">
                            <Input
                                label="Nom d'utilisateur"
                                type="text"
                                placeholder="Votre pseudo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <Input
                                label="Email"
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                label="Mot de passe"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                hint="Minimum 6 caractères"
                                required
                            />
                            <Input
                                label="Confirmer le mot de passe"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                error={confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
                                required
                            />
                            <Button type="submit" fullWidth isLoading={isLoading}>
                                Créer mon compte
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Déjà un compte ?{' '}
                            <Link
                                href="/login"
                                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                            >
                                Se connecter
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-8">
                    Le tracker de babyfoot ultime 🏆
                </p>
            </div>
        </div>
    );
}
