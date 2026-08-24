/**
 * Bouton de connexion Google — chantier 0.7.
 *
 * En COMPLÉMENT de l'email/mot de passe, jamais en remplacement : sur les 147
 * comptes existants, 34 utilisent une adresse non-Google et ne pourront jamais
 * s'en servir.
 *
 * Gère de bout en bout le cas de la liaison : le projet est réglé sur « une
 * seule adresse par compte », donc si l'adresse Google a déjà un compte mot de
 * passe, Firebase refuse la connexion. On demande alors le mot de passe une
 * dernière fois et on rattache Google au compte existant. Le même UID est
 * conservé : ELO, statistiques, amis et historique restent intacts.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithGoogle,
    linkGoogleToExistingAccount,
    GoogleLinkRequiredError,
    type SignInOutcome,
} from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import styles from './GoogleSignInButton.module.css';

/** Logo Google officiel, en SVG inline. */
function GoogleLogo() {
    return (
        <svg className={styles.logo} viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

export default function GoogleSignInButton({ label = 'Continuer avec Google' }: { label?: string }) {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkRequest, setLinkRequest] = useState<GoogleLinkRequiredError | null>(null);
    const [password, setPassword] = useState('');

    const routeAfterSignIn = (outcome: SignInOutcome) => {
        // Pas de profil : le joueur doit choisir son pseudo avant d'entrer.
        if (outcome.needsUsername) {
            router.push('/welcome');
            return;
        }
        if (outcome.user) setUser(outcome.user);
        router.push('/dashboard');
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        setError('');
        try {
            routeAfterSignIn(await signInWithGoogle());
        } catch (err) {
            if (err instanceof GoogleLinkRequiredError) {
                setLinkRequest(err);
            } else {
                const code = (err as { code?: string })?.code;
                // Fermer la fenêtre Google n'est pas une erreur : on se tait.
                if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
                    setError('La connexion Google a échoué. Réessaie ou utilise ton mot de passe.');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkRequest) return;
        setIsLoading(true);
        setError('');
        try {
            routeAfterSignIn(
                await linkGoogleToExistingAccount(linkRequest.email, password, linkRequest.pendingCredential)
            );
        } catch {
            setError('Mot de passe incorrect.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={styles.separator}>
                <span className={styles.separatorText}>ou</span>
            </div>

            <button type="button" className={styles.button} onClick={handleGoogle} disabled={isLoading}>
                <GoogleLogo />
                {isLoading ? 'Connexion...' : label}
            </button>

            {error && <p className={styles.error}>{error}</p>}

            {linkRequest && (
                <form className={styles.linkBox} onSubmit={handleLink}>
                    <p className={styles.linkText}>
                        Un compte existe déjà avec <strong>{linkRequest.email}</strong>.
                        Saisis ton mot de passe une dernière fois pour y rattacher Google.
                        Tu gardes ton compte, tes parties et ton classement.
                    </p>
                    {/* Avertissement indispensable : Firebase SUPPRIME le mot de passe
                        quand on rattache un fournisseur qui vérifie l'adresse, si cette
                        adresse n'avait jamais été vérifiée. C'est une protection contre
                        le vol de compte, mais l'utilisateur doit le savoir AVANT. */}
                    <p className={styles.linkWarning}>
                        Après ça, tu te connecteras avec Google. Ton mot de passe actuel ne
                        fonctionnera plus — tu pourras en définir un nouveau à tout moment
                        via « Mot de passe oublié ».
                    </p>
                    <input
                        type="password"
                        className={styles.linkInput}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mot de passe"
                        autoComplete="current-password"
                        required
                    />
                    <button type="submit" className={styles.button} disabled={isLoading || !password}>
                        {isLoading ? 'Liaison...' : 'Lier mon compte Google'}
                    </button>
                </form>
            )}
        </>
    );
}
