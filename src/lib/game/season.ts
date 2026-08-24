'use client';

/**
 * LA SAISON EN COURS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CHAQUE PARTIE PORTE SON `seasonId`
 * ═══════════════════════════════════════════════════════════════════════════
 * Le profil doit pouvoir montrer « mes stats de la saison 0 ». Deux façons de
 * savoir à quelle saison appartient une partie :
 *
 *   - la borner par DATES, en comparant `startedAt` à la fenêtre de la saison.
 *     Aucune donnée à ajouter, mais un calcul à chaque filtrage, et surtout
 *     une requête impossible à faire côté serveur ;
 *   - écrire un `seasonId` SUR la partie.
 *
 * Sacha a tranché pour le second (24/08) : « plutôt mettre un season ID parce
 * que le temps c'est chiant ». Il a raison au-delà du confort — c'est ce qui
 * permet un `where('seasonId', '==', …)` côté Firestore, donc de ne PAS
 * télécharger toutes les parties pour en garder un dixième.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LU EN BASE, PAS ÉCRIT EN DUR
 * ═══════════════════════════════════════════════════════════════════════════
 * L'identifiant vient de la collection `seasons`, pas d'une constante : au
 * changement de saison, le script de clôture suffit — aucun redéploiement.
 *
 * La lecture est mise en cache pour la durée de la session : une partie n'est
 * pas créée assez souvent pour justifier une requête à chaque fois, et une
 * saison ne change pas en cours de route.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/config';

/**
 * La saison à laquelle rattacher une partie qui n'en porterait aucune.
 *
 * Les 1 023 parties d'avant le 24/08 ont été rattachées à celle-ci : la
 * « saison 0 » est par définition la période écoulée jusqu'à la première
 * clôture.
 */
export const SAISON_PAR_DEFAUT = 'season_0';

let enCache: Promise<string> | null = null;

/**
 * L'identifiant de la saison ouverte.
 *
 * Retombe sur `SAISON_PAR_DEFAUT` si la collection est vide ou illisible :
 * une partie doit pouvoir démarrer même si la lecture échoue. Mieux vaut une
 * partie rattachée à la mauvaise saison qu'une partie qui ne démarre pas.
 */
export function saisonCourante(): Promise<string> {
    if (enCache) return enCache;

    enCache = getDocs(query(
        collection(getFirebaseDb(), 'seasons'),
        where('status', '==', 'active'),
    ))
        .then(snap => (snap.empty ? SAISON_PAR_DEFAUT : snap.docs[0].id))
        .catch(() => SAISON_PAR_DEFAUT);

    return enCache;
}

/** Pour les tests, et pour le jour où une clôture tourne pendant une session. */
export function oublierLaSaisonEnCache(): void {
    enCache = null;
}
