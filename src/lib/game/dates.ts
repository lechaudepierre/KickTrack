/**
 * LIRE UNE DATE VENANT DE FIRESTORE — une seule implémentation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE — chantier 9.2
 * ═══════════════════════════════════════════════════════════════════════════
 * Une même date arrive sous TROIS formes selon d'où elle vient :
 *   • un `Timestamp` Firestore, quand elle sort d'une lecture directe ;
 *   • une `Date`, quand elle vient d'un cache ou d'un objet construit en
 *     mémoire ;
 *   • une chaîne ISO, quand elle a transité par une réponse d'API.
 *
 * Chaque endroit qui lisait une date avait donc sa propre conversion — j'en ai
 * compté **neuf**, toutes légèrement différentes, dont plusieurs avec un
 * `as any` pour contourner le typage. Certaines ne géraient qu'une des trois
 * formes et renvoyaient `NaN` sur les autres, silencieusement.
 *
 * Un `NaN` dans une date ne lève rien : il se propage dans les tris, les
 * durées et les comparaisons, et produit un résultat faux sans erreur.
 *
 * Module pur, testé. Toute lecture de date passe désormais par ici.
 */

/** Les formes sous lesquelles une date peut arriver. */
export type DateLike =
    | Date
    | string
    | number
    | { toDate: () => Date }
    | { seconds: number }
    | null
    | undefined;

/**
 * Millisecondes depuis l'époque, ou `0` si la valeur est inexploitable.
 *
 * On renvoie `0` plutôt que `NaN` : une date manquante doit se comporter comme
 * « très ancienne », pas contaminer tous les calculs qui la touchent.
 */
export function toMillis(value: DateLike): number {
    if (value == null) return 0;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const t = new Date(value).getTime();
        return Number.isNaN(t) ? 0 : t;
    }

    // Timestamp Firestore, dans ses deux formes : l'objet complet du SDK, ou
    // sa version sérialisée qui n'a plus que `seconds`.
    if (typeof (value as { toDate?: unknown }).toDate === 'function') {
        const d = (value as { toDate: () => Date }).toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    const s = (value as { seconds?: unknown }).seconds;
    if (typeof s === 'number' && Number.isFinite(s)) return s * 1000;

    return 0;
}

/** La même valeur, en `Date`. L'époque si la valeur est inexploitable. */
export function toDate(value: DateLike): Date {
    return new Date(toMillis(value));
}

/**
 * L'instant de début d'une partie.
 *
 * ⚠️ `startedAt` et `startTime` sont LE MÊME CHAMP, écrit deux fois depuis
 * toujours — les 1 020 parties de production portent les deux, et elles sont
 * cohérentes. `startedAt` fait foi ; `startTime` reste écrit pour ne pas
 * casser les parties déjà enregistrées, et sert de repli.
 *
 * Passer par cette fonction évite d'avoir à se souvenir lequel lire : selon
 * l'endroit, le code utilisait l'un ou l'autre, sans raison apparente.
 */
export function gameStartMs(game: { startedAt?: DateLike; startTime?: DateLike }): number {
    return toMillis(game?.startedAt) || toMillis(game?.startTime);
}
