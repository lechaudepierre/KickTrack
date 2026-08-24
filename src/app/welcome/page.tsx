/**
 * Choix du pseudo — chantier 0.7.
 *
 * Un seul écran pour trois situations, volontairement :
 *   1. nouveau compte Google (Google ne fournit aucun pseudo)
 *   2. inscription interrompue laissant un compte sans profil (chantier 9.8)
 *   3. tout futur compte authentifié sans document Firestore
 *
 * La règle est simple : un compte authentifié sans profil atterrit ici.
 * C'est le seul endroit du code qui crée un profil hors inscription classique.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase/config';
import { completeProfile, resolveProfile } from '@/lib/firebase/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import styles from './page.module.css';

export default function WelcomePage() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Personne ne doit rester bloqué ici par erreur : si un profil existe déjà,
    // on repart directement vers l'app.
    useEffect(() => {
        const currentUser = getFirebaseAuth().currentUser;
        if (!currentUser) {
            router.replace('/');
            return;
        }

        resolveProfile(currentUser)
            .then(outcome => {
                if (!outcome.needsUsername && outcome.user) {
                    setUser(outcome.user);
                    router.replace('/dashboard');
                    return;
                }
                setIsChecking(false);
            })
            .catch(() => setIsChecking(false));
    }, [router, setUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            const user = await completeProfile(username);
            setUser(user);
            router.replace('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsSaving(false);
        }
    };

    if (isChecking) return null;

    return (
        <div className={styles.wrapper}>
            <FieldBackground />
            <div className={styles.card}>
                <h1 className={styles.title}>Choisis ton pseudo</h1>
                <p className={styles.intro}>
                    C&apos;est le nom que verront les autres joueurs, au classement et pendant les parties.
                    Tu pourras le changer plus tard depuis ton profil.
                </p>

                <form onSubmit={handleSubmit}>
                    <label className={styles.label} htmlFor="username">Pseudo</label>
                    <input
                        id="username"
                        className={styles.input}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={25}
                        autoFocus
                        autoComplete="off"
                        disabled={isSaving}
                        required
                    />
                    <p className={styles.hint}>Entre 2 et 25 caractères.</p>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit"
                        className={styles.submit}
                        disabled={isSaving || username.trim().length < 2}
                    >
                        {isSaving ? 'Création...' : 'Commencer à jouer'}
                    </button>
                </form>
            </div>
        </div>
    );
}
