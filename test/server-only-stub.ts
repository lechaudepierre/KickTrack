/**
 * Remplaçant de `server-only` pour les tests.
 *
 * Le vrai paquet lève une erreur dès qu'il est importé hors d'un contexte
 * serveur — c'est exactement son rôle : empêcher qu'un module contenant des
 * identifiants admin finisse dans un bundle client.
 *
 * Vitest n'est ni l'un ni l'autre. On neutralise donc le garde-fou pour les
 * tests uniquement ; il reste actif au build et en production.
 */
export {};
