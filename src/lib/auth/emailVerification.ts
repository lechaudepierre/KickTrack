/**
 * Faut-il inviter ce joueur à confirmer son adresse ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE CHANTIER EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Firebase supprime un identifiant mot de passe dont l'adresse n'est PAS
 * vérifiée dès que le compte se connecte avec un fournisseur qui, lui, vérifie
 * l'adresse (Google). C'est une protection anti-usurpation : tant que personne
 * n'a prouvé qu'il possède l'adresse, le mot de passe n'est pas digne de
 * confiance.
 *
 * Conséquence chez nous, mesurée le 21 août 2026 sur les 147 comptes de
 * production : 143 ont un mot de passe, et **3 seulement** ont une adresse
 * vérifiée. Les 140 autres perdent leur mot de passe à leur première connexion
 * Google, sans le savoir. C'est arrivé à Sacha.
 *
 * Confirmer l'adresse rend l'opération inoffensive : les deux méthodes
 * coexistent alors définitivement. La vérification n'est donc pas une case à
 * cocher de sécurité, c'est le correctif de la cause.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ON NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 * On ne bloque rien. Un joueur non vérifié garde l'accès complet à l'app.
 * Poser un mur six semaines avant la saison 1, sur une centaine de joueurs
 * réels, coûterait du support sans rien protéger de plus : les écritures de
 * valeur passent déjà par le serveur.
 *
 * Ce module est pur — aucun accès à Firebase, aucun accès au navigateur — pour
 * rester testable. Voir `emailVerification.test.ts`.
 */

/** Ce que le module a besoin de savoir d'un compte. Sous-ensemble de FirebaseUser. */
export interface VerifiableAccount {
    email: string | null;
    emailVerified: boolean;
    providerData: ReadonlyArray<{ providerId: string }>;
}

/** Délai avant de reproposer la confirmation à quelqu'un qui a écarté le bandeau. */
export const SNOOZE_DAYS = 7;

/**
 * Le compte peut-il perdre son mot de passe lors d'une connexion Google ?
 *
 * Trois conditions, toutes nécessaires :
 *   - il a une adresse (les 4 comptes anonymes n'en ont pas) ;
 *   - elle n'est pas vérifiée ;
 *   - il a bien un identifiant mot de passe à perdre. Un compte créé
 *     directement avec Google a son adresse vérifiée d'office et n'a aucun
 *     mot de passe : l'inviter à confirmer n'aurait aucun sens.
 */
export function isPasswordAtRisk(account: VerifiableAccount | null): boolean {
    if (!account) return false;
    if (!account.email) return false;
    if (account.emailVerified) return false;
    return account.providerData.some(p => p.providerId === 'password');
}

/**
 * Faut-il afficher le bandeau maintenant ?
 *
 * @param snoozedUntil instant jusqu'auquel le joueur a écarté le bandeau,
 *                     en millisecondes ; `null` s'il ne l'a jamais écarté.
 * @param now          instant courant, injecté pour rester testable.
 */
export function shouldPromptVerification(
    account: VerifiableAccount | null,
    snoozedUntil: number | null,
    now: number,
): boolean {
    if (!isPasswordAtRisk(account)) return false;
    if (snoozedUntil === null) return true;
    return now >= snoozedUntil;
}

/** Instant jusqu'auquel écarter le bandeau, à partir de maintenant. */
export function snoozeUntil(now: number): number {
    return now + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

/** Clé de stockage local. Par compte : un téléphone peut en voir passer plusieurs. */
export function snoozeStorageKey(userId: string): string {
    return `kicktrack.emailVerification.snooze.${userId}`;
}
