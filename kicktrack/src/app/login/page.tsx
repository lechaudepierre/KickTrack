'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import styles from './page.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const user = await login(email, password);
            if (user) {
                setUser(user);
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
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
                    <p className={styles.subtitle}>Connexion à votre compte</p>
                </div>

                {/* Card */}
                <div className={styles.card}>
                    <div className={styles.cardAccent} />

                    {error && (
                        <div className="error-box">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className={styles.form}>
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
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={styles.submitButton}
                        >
                            <div className="btn-primary">
                                <div className="btn-primary-shadow" />
                                <div className="btn-primary-content">
                                    {isLoading ? 'CONNEXION...' : 'SE CONNECTER'}
                                </div>
                            </div>
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <p className={styles.dividerText}>
                            Pas encore de compte ?{' '}
                            <Link href="/register" className={styles.link}>
                                S'INSCRIRE
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.footerDivider} />
                    <p className={styles.footerText}>Secure Login</p>
                    <div className={styles.footerDivider} />
                </div>
            </div>
        </div>
    );
}
