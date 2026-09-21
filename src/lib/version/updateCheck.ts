/**
 * FAUT-IL RECHARGER LA PAGE ? — la décision, isolée et testable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PROBLÈME QUE ÇA CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le 21/09, après le déploiement de la V2 : « tout le monde ne voit pas la
 * nouvelle mise à jour ».
 *
 * KickTracker est une PWA (`display: standalone` dans le manifeste) : beaucoup
 * de joueurs l'ont ajoutée à leur écran d'accueil. Une PWA ouverte depuis
 * l'écran d'accueil ne recharge PAS la page quand on y revient — iOS restitue
 * l'état précédent. Le joueur garde donc le code du jour où il l'a ouverte pour
 * la première fois, parfois des semaines.
 *
 * Il n'y a pas de service worker dans ce projet, donc rien ne surveillait ça.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE JAMAIS RECHARGER PENDANT UN MATCH
 * ═══════════════════════════════════════════════════════════════════════════
 * Un rechargement pendant qu'on compte les buts, c'est pire que la version
 * périmée : on perd le fil de la partie sous les doigts de celui qui marque.
 *
 * Les écrans de jeu sont donc exclus. Le joueur repassera par le tableau de
 * bord en sortant du match, et c'est là que la mise à jour se fera — sans
 * qu'il s'en aperçoive.
 *
 * Module pur : aucune dépendance au navigateur, entièrement testable.
 */

/** Ce que le client sait de lui-même, et ce que le serveur répond. */
export interface EtatDeVersion {
    /** Version avec laquelle cette page a été construite. */
    chargee: string | undefined;
    /** Version actuellement déployée, telle que le serveur la rapporte. */
    deployee: string | undefined;
}

/**
 * Les chemins sur lesquels on ne recharge JAMAIS.
 *
 * Une partie en cours, un tournoi en cours, un lancement de partie : tous ces
 * écrans portent un état que le joueur est en train de construire.
 */
export const CHEMINS_PROTEGES = ['/game/', '/tournament/'];

/** Ce chemin porte-t-il une action en cours ? */
export function cheminProtege(chemin: string): boolean {
    return CHEMINS_PROTEGES.some(prefixe => chemin.startsWith(prefixe));
}

/**
 * Les deux versions diffèrent-elles vraiment ?
 *
 * Une version absente d'un côté ou de l'autre ne prouve RIEN : en
 * développement il n'y a pas d'identifiant de déploiement, et une réponse
 * tronquée ne doit pas provoquer de rechargement en boucle. Dans le doute, on
 * ne touche à rien.
 */
export function versionDifferente(etat: EtatDeVersion): boolean {
    const { chargee, deployee } = etat;
    if (!chargee || !deployee) return false;
    return chargee !== deployee;
}

/**
 * Faut-il recharger maintenant ?
 *
 * Trois conditions, toutes nécessaires : une vraie différence de version, un
 * écran où l'interruption ne coûte rien, et une page visible — recharger un
 * onglet en arrière-plan ne sert à rien et fait travailler le téléphone pour
 * personne.
 */
export function doitRecharger(etat: EtatDeVersion, chemin: string, visible: boolean): boolean {
    if (!visible) return false;
    if (cheminProtege(chemin)) return false;
    return versionDifferente(etat);
}
