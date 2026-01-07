'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerComplete } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import styles from './page.module.css';

export default function RegisterPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
        <div className="min-h-screen bg-[#0F172A] relative flex flex-col items-center justify-center p-6">
            <FieldBackground />

            <div className={styles.container}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <h1 className={styles.title}>
                        KICK<span className={styles.titleAccent}>TRACK</span>
                    </h1>
                    <div className={styles.titleUnderline} />
                    <p className={styles.subtitle}>Créez votre compte</p>
                </div>

                {/* Card */}
                <div className={styles.card}>
                    <div className={styles.cardAccent} />

                    {error && (
                        <div className="error-box">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleCompleteRegister} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className="input-label">Nom d'utilisateur</label>
                            <input
                                type="text"
                                placeholder="Votre pseudo"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className="input-label">Email</label>
                            <input
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className="input-label">Mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input-field"
                            />
                            <p className={styles.hint}>Minimum 6 caractères</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className="input-label">Confirmer le mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={`input-field ${confirmPassword && password !== confirmPassword ? 'error' : ''}`}
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className={styles.errorHint}>⚠ Les mots de passe ne correspondent pas</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={styles.submitButton}
                        >
                            <div className="btn-primary">
                                <div className="btn-primary-shadow" />
                                <div className="btn-primary-content">
                                    {isLoading ? 'CRÉATION...' : 'CRÉER MON COMPTE'}
                                </div>
                            </div>
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <p className={styles.dividerText}>
                            Déjà un compte ?{' '}
                            <Link href="/login" className={styles.link}>
                                SE CONNECTER
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.footerDivider} />
                    <p className={styles.footerText}>Join the Game</p>
                    <div className={styles.footerDivider} />
                </div>
            </div>
        </div>
    );
}
