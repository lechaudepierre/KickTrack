'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, resetPassword } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import GoogleSignInButton from '@/components/common/GoogleSignInButton';
import { useFeaturePreAuth } from '@/lib/features';
import styles from './page.module.css';

/**
 * Ce compte se connecte-t-il uniquement avec Google ?
 * Renvoie le message à afficher, ou null si ce n'est pas le cas.
 */
async function googleOnlyMessage(email: string): Promise<string | null> {
    try {
        const res = await fetch('/api/auth/methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const { useGoogle } = await res.json();
        return useGoogle
            ? 'Ce compte se connecte avec Google. Utilise le bouton « Se connecter avec Google » ci-dessous.'
            : null;
    } catch {
        // Le diagnostic est un confort, pas une étape obligatoire : s'il échoue,
        // on retombe sur le message générique.
        return null;
    }
}

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    // Écran d'avant connexion : on ne peut pas savoir qui est devant, donc
    // l'audience `admins` vaut visible. Voir useFeaturePreAuth.
    const v2Enabled = useFeaturePreAuth('v2');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResetSent(false);

        try {
            const user = await login(email, password);
            if (user) {
                setUser(user);
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            const error = err as { code?: string };
            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password': {
                    // Le mot de passe peut être introuvable parce que le compte
                    // est passé à Google : Firebase supprime le mot de passe
                    // quand on lie un fournisseur qui vérifie l'adresse, si
                    // celle-ci ne l'était pas. Dire « mot de passe incorrect »
                    // envoie alors le joueur chercher au mauvais endroit.
                    setError(await googleOnlyMessage(email) ?? 'Mot de passe incorrect');
                    break;
                }
                case 'auth/user-not-found':
                    setError('Aucun compte trouvé avec cet email');
                    break;
                case 'auth/invalid-email':
                    setError('Format d\'email invalide');
                    break;
                case 'auth/too-many-requests':
                    setError('Trop de tentatives. Réessayez plus tard.');
                    break;
                case 'auth/user-disabled':
                    setError('Ce compte a été désactivé');
                    break;
                default:
                    setError('Erreur de connexion. Vérifiez vos identifiants.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            setError('Entrez votre email pour réinitialiser le mot de passe');
            return;
        }

        setResetLoading(true);
        setError('');
        setResetSent(false);

        try {
            await resetPassword(email);
            setResetSent(true);
        } catch (err: unknown) {
            const error = err as { code?: string };
            if (error.code === 'auth/user-not-found') {
                setError('Aucun compte trouvé avec cet email');
            } else if (error.code === 'auth/invalid-email') {
                setError('Format d\'email invalide');
            } else {
                setError('Erreur lors de l\'envoi. Vérifiez votre email.');
            }
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className={styles.screen}>
            <div className={styles.container}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <h1 className={styles.title}>
                        KICK<span className={styles.titleAccent}>TRACKER</span>
                    </h1>
                    <p className={styles.subtitle}>Connexion</p>
                </div>

                {/* Form */}
                <div className={styles.card}>
                    {error && (
                        <div className={styles.errorBox}>
                            {error}
                        </div>
                    )}

                    {resetSent && (
                        <div className={styles.successBox}>
                            Un email de réinitialisation a été envoyé à <strong>{email}</strong>
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
                            <button type="button"
                                onClick={handleResetPassword}
                                disabled={resetLoading}
                                className={styles.forgotPassword}
                            >
                                {resetLoading ? 'Envoi...' : 'Mot de passe oublié ?'}
                            </button>
                        </div>

                        <button type="submit"
                            disabled={isLoading}
                            className={styles.submitButton}
                        >
                            {isLoading ? 'CONNEXION...' : 'SE CONNECTER'}
                        </button>
                    </form>

                    {v2Enabled && <GoogleSignInButton label="Se connecter avec Google" />}

                    <div className={styles.divider}>
                        <span className={styles.dividerText}>
                            Pas de compte ?{' '}
                            <Link href="/register" className={styles.link}>
                                S&apos;inscrire
                            </Link>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
