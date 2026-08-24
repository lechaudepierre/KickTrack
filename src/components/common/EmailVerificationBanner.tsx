'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { sendVerificationEmail, refreshVerificationStatus } from '@/lib/firebase/auth';
import {
    shouldPromptVerification,
    snoozeUntil,
    snoozeStorageKey,
} from '@/lib/auth/emailVerification';
import styles from './EmailVerificationBanner.module.css';

type Phase = 'invite' | 'envoi' | 'envoye' | 'erreur';

/* ─── Le report, lu comme une source de données extérieure ────────────────────
   Le report vit dans le stockage local, qui n'existe pas côté serveur.
   `useSyncExternalStore` est fait exactement pour ça : il fournit un instantané
   serveur (rien) et un instantané client, sans divergence d'hydratation et sans
   appeler `setState` depuis un effet.

   L'événement `storage` du navigateur ne se déclenche que dans les AUTRES
   onglets. Pour que « Plus tard » ait un effet immédiat dans l'onglet courant,
   on tient notre propre liste d'abonnés. */
const abonnes = new Set<() => void>();

function prevenir() {
    for (const cb of abonnes) cb();
}

function souscrire(cb: () => void) {
    abonnes.add(cb);
    window.addEventListener('storage', cb);
    return () => {
        abonnes.delete(cb);
        window.removeEventListener('storage', cb);
    };
}

/**
 * Invite à confirmer son adresse — sans jamais bloquer l'accès.
 *
 * Cible les 140 comptes de production dont l'adresse n'est pas vérifiée : leur
 * mot de passe disparaîtra à leur première connexion Google. La règle de
 * ciblage vit dans `lib/auth/emailVerification.ts`, qui est testé ; ce
 * composant ne fait que l'afficher.
 */
export default function EmailVerificationBanner() {
    const { firebaseUser } = useAuthStore();
    const userId = firebaseUser?.uid;

    const reportBrut = useSyncExternalStore(
        souscrire,
        () => (userId ? window.localStorage.getItem(snoozeStorageKey(userId)) : null),
        () => null,
    );

    // L'instant courant est FIGÉ à l'arrivée. `Date.now()` appelé à chaque
    // rendu rendrait le composant non idempotent : deux rendus successifs
    // pourraient décider différemment.
    const [maintenant] = useState(() => Date.now());
    const [phase, setPhase] = useState<Phase>('invite');
    const [message, setMessage] = useState('');
    // Le joueur revient-il de sa boîte mail après avoir cliqué ?
    const [confirmeEntreTemps, setConfirmeEntreTemps] = useState(false);

    // Au retour sur l'onglet, on redemande l'état à Firebase : le drapeau
    // `emailVerified` est figé dans le jeton local et reste faux après le clic
    // sur le lien tant qu'on n'a pas rechargé.
    useEffect(() => {
        const auRetour = () => {
            void refreshVerificationStatus().then(ok => {
                if (ok) setConfirmeEntreTemps(true);
            });
        };
        window.addEventListener('focus', auRetour);
        return () => window.removeEventListener('focus', auRetour);
    }, []);

    if (confirmeEntreTemps) return null;

    const visible = shouldPromptVerification(
        firebaseUser
            ? {
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified,
                providerData: firebaseUser.providerData,
            }
            : null,
        reportBrut === null ? null : Number(reportBrut),
        maintenant,
    );
    if (!visible) return null;

    const envoyer = async () => {
        setPhase('envoi');
        try {
            await sendVerificationEmail();
            setPhase('envoye');
        } catch (err) {
            const code = (err as { code?: string })?.code;
            setMessage(code === 'auth/too-many-requests'
                ? 'Trop d\'envois en peu de temps. Réessaie dans quelques minutes.'
                : 'L\'envoi a échoué. Réessaie dans un instant.');
            setPhase('erreur');
        }
    };

    const plusTard = () => {
        if (!userId) return;
        // Dans un gestionnaire d'événement, `Date.now()` est légitime : on n'est
        // plus dans le rendu.
        window.localStorage.setItem(snoozeStorageKey(userId), String(snoozeUntil(Date.now())));
        prevenir();
    };

    if (phase === 'envoye') {
        return (
            <div className={`${styles.banner} ${styles.done}`} role="status">
                <p className={styles.title}>Mail envoyé à {firebaseUser?.email}</p>
                <p className={styles.text}>
                    Clique sur le lien, puis reviens ici. Pense à regarder dans les indésirables.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.banner} role="status">
            <p className={styles.title}>Confirme ton adresse</p>
            <p className={styles.text}>
                Sans confirmation, ton mot de passe sera supprimé le jour où tu te connecteras
                avec Google. Un clic dans un mail, et les deux méthodes fonctionnent pour de bon.
            </p>
            {phase === 'erreur' && <p className={styles.error}>{message}</p>}
            <div className={styles.actions}>
                <button type="button" onClick={envoyer} disabled={phase === 'envoi'}
                    className={styles.primary}>
                    {phase === 'envoi' ? 'Envoi...' : 'Recevoir le mail'}
                </button>
                <button type="button" onClick={plusTard} className={styles.secondary}>
                    Plus tard
                </button>
            </div>
        </div>
    );
}
