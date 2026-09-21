'use client';

/**
 * LE VEILLEUR DE VERSION — pour que tout le monde finisse par avoir la maj.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PROBLÈME
 * ═══════════════════════════════════════════════════════════════════════════
 * KickTracker est une PWA que beaucoup de joueurs ont ajoutée à leur écran
 * d'accueil. Rouvrir une PWA depuis l'écran d'accueil ne recharge PAS la
 * page : le système restitue l'état précédent. Le joueur garde donc le code du
 * jour où il l'a installée, parfois des semaines.
 *
 * Signalé le 21/09, après le déploiement de la V2 : « tout le monde ne voit
 * pas la nouvelle mise à jour ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUAND ON VÉRIFIE
 * ═══════════════════════════════════════════════════════════════════════════
 *   - au premier rendu ;
 *   - CHAQUE FOIS QUE LA PAGE REDEVIENT VISIBLE. C'est le moment qui compte :
 *     c'est exactement ce qui se passe quand on rouvre la PWA ;
 *   - toutes les 30 minutes, pour l'onglet laissé ouvert toute la journée.
 *
 * On ne vérifie jamais en arrière-plan : ça ferait travailler le téléphone
 * pour personne.
 *
 * La décision elle-même vit dans `lib/version/updateCheck.ts`, qui est pur et
 * testé. Ce composant ne fait que l'appliquer.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { doitRecharger } from '@/lib/version/updateCheck';

/** Le tour d'horloge pour un onglet resté ouvert. */
const PERIODE_MS = 30 * 60 * 1000;

export default function VersionWatcher() {
    const chemin = usePathname();

    /*
     * Le chemin est lu dans une ref, pas capturé.
     *
     * L'abonnement à `visibilitychange` est posé UNE fois : s'il dépendait du
     * chemin, il serait démonté et reposé à chaque navigation. La ref permet
     * de toujours lire le chemin courant au moment du contrôle.
     *
     * Elle est écrite dans un effet et non pendant le rendu : React 19 refuse
     * la seconde forme, et il a raison — un rendu doit rester sans effet de
     * bord.
     */
    const cheminRef = useRef(chemin);
    useEffect(() => { cheminRef.current = chemin; }, [chemin]);

    /* Un rechargement est en cours : ne pas en déclencher un second. */
    const dejaLance = useRef(false);

    useEffect(() => {
        const chargee = process.env.VERSION_DEPLOIEMENT;

        // En développement il n'y a pas d'identifiant de déploiement. Ne rien
        // surveiller plutôt que recharger sans arrêt pendant qu'on code.
        if (!chargee || chargee === 'dev') return;

        let annule = false;

        const verifier = async () => {
            if (annule || dejaLance.current) return;
            if (document.visibilityState !== 'visible') return;

            try {
                const reponse = await fetch('/api/version', { cache: 'no-store' });
                if (!reponse.ok) return;
                const { version } = (await reponse.json()) as { version?: string };
                if (annule) return;

                const recharger = doitRecharger(
                    { chargee, deployee: version },
                    cheminRef.current ?? '/',
                    document.visibilityState === 'visible',
                );

                if (recharger) {
                    dejaLance.current = true;
                    // `reload()` et non une navigation : il faut que le
                    // navigateur reparte chercher le document, pas qu'il
                    // rejoue le même bundle.
                    window.location.reload();
                }
            } catch {
                // Hors ligne, ou serveur injoignable. Ce n'est pas une erreur
                // à signaler au joueur : on réessaiera au prochain réveil.
            }
        };

        const surVisibilite = () => {
            if (document.visibilityState === 'visible') verifier();
        };

        verifier();
        document.addEventListener('visibilitychange', surVisibilite);
        const minuterie = setInterval(verifier, PERIODE_MS);

        return () => {
            annule = true;
            document.removeEventListener('visibilitychange', surVisibilite);
            clearInterval(minuterie);
        };
    }, []);

    return null;
}
