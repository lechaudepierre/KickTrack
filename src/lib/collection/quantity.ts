/**
 * EXEMPLAIRES POSSÉDÉS — règles pures.
 *
 * Ce module existe pour une raison précise : `grant.ts` importe `server-only`,
 * parce qu'il touche `firebase-admin`. Les règles de quantité, elles, sont du
 * calcul sur des nombres et le CLIENT en a besoin pour afficher « x3 ». Les
 * laisser dans `grant.ts` faisait remonter `server-only` jusqu'à la page
 * Collection, qui est un composant client — d'où l'erreur de compilation.
 *
 * Règle générale à retenir : tout ce qui est de la LOGIQUE et pas de l'ACCÈS
 * doit vivre hors des modules `server-only`. C'est aussi ce qui les rend
 * testables sans Firebase.
 */

/**
 * Nombre d'exemplaires que porte un document d'inventaire.
 *
 * Les documents créés avant le 21/08 n'ont pas le champ `quantity` : ils
 * valent UN exemplaire. Renvoyer zéro les ferait disparaître à la première
 * révocation, alors que le joueur possède bien l'item.
 */
export function readQuantity(data: { quantity?: number } | undefined | null): number {
    const q = data?.quantity;
    return typeof q === 'number' && q > 0 ? Math.floor(q) : 1;
}

/**
 * Cet octroi a-t-il ajouté un exemplaire à l'inventaire ?
 *
 * Depuis le 21/08, oui, toujours : un doublon s'empile au lieu d'être ignoré.
 * Les octrois antérieurs n'ont pas le champ ; à l'époque, un doublon
 * n'ajoutait rien. Les révoquer ne doit donc RIEN décrémenter — sinon on
 * retirerait au joueur un exemplaire qu'il avait acquis autrement.
 */
export function grantAddedACopy(grant: { duplicate: boolean; addedCopy?: boolean }): boolean {
    return grant.addedCopy ?? !grant.duplicate;
}

/**
 * Ce que devient l'inventaire quand on retire UN exemplaire.
 * Le document disparaît seulement quand il ne reste plus rien.
 */
export function afterRemovingOneCopy(current: number): { quantity: number; deleted: boolean } {
    const next = current - 1;
    return next <= 0 ? { quantity: 0, deleted: true } : { quantity: next, deleted: false };
}
