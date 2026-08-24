/**
 * `grantItem` — L'OPÉRATION CENTRALE DU SOCLE COLLECTION
 * Doc/v2-refactor/20-socle-collection.md · chantier 2.4
 *
 * [interdit] CÔTÉ SERVEUR UNIQUEMENT (SDK admin).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'INVARIANT D'ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUTES les sources d'items — pack, saison, event, exploit, admin — passent
 * par cette fonction et n'ont AUCUNE logique d'inventaire propre.
 *
 * Une feature de Phase 3 n'écrit jamais dans `inventory` elle-même : elle
 * appelle `grantItem`, point. Si vous vous surprenez à écrire un inventaire
 * ailleurs, c'est une erreur d'architecture, pas un raccourci.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * IDEMPOTENCE — pourquoi c'est non négociable
 * ═══════════════════════════════════════════════════════════════════════════
 * La clôture de saison distribue des récompenses à ~150 joueurs d'un coup
 * (doc 31). Si le script meurt à mi-parcours, il faut pouvoir le relancer
 * SANS que les 80 premiers reçoivent leur récompense deux fois.
 *
 * D'où `grantId`, déterministe : même source + même référence + même joueur
 * + même item ⇒ même identifiant ⇒ le second octroi est un no-op constaté.
 * Toute la transaction (lecture du grant, écriture de l'inventaire, écriture
 * du grant) est atomique.
 */

import 'server-only';

import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { CatalogItem, ItemSource, GrantRecord } from '@/types/collection';
import { readQuantity, grantAddedACopy, afterRemovingOneCopy } from './quantity';

export interface GrantParams {
    userId: string;
    itemId: string;
    source: ItemSource;
    /** Origine précise : `season_0`, `pack_abc123`, `event_bar_x`… */
    sourceRef?: string;
}

export interface GrantResult {
    granted: boolean;
    /** L'item était déjà possédé. Deviendra une conversion en monnaie (bloc 4). */
    duplicate: boolean;
    /** L'octroi avait déjà été enregistré : rien n'a été refait. */
    alreadyProcessed: boolean;
    itemId: string;
    grantId: string;
}

/**
 * Identifiant d'octroi déterministe.
 *
 * Sans `sourceRef`, on retombe sur `source:itemId` — ce qui rend l'octroi
 * unique *par source*. C'est le comportement voulu pour les items de
 * prestige (on ne reçoit pas deux fois la bannière de créateur), mais pas
 * pour les packs : ceux-ci doivent TOUJOURS passer un `sourceRef` unique
 * (l'id du pack ouvert), sinon la deuxième ouverture serait ignorée.
 */
export function buildGrantId(params: GrantParams): string {
    const ref = params.sourceRef ? `:${params.sourceRef}` : '';
    return `${params.source}${ref}:${params.itemId}`;
}

/**
 * Octroie un item à un joueur. Transactionnel et idempotent.
 *
 * @throws si l'item n'existe pas au catalogue — on n'octroie jamais un
 * identifiant fantôme, sinon l'inventaire se remplit d'items
 * inaffichables.
 */
export async function grantItem(db: Firestore, params: GrantParams): Promise<GrantResult> {
    const { userId, itemId, source, sourceRef } = params;
    const grantId = buildGrantId(params);

    const catalogSnap = await db.collection('catalog').doc(itemId).get();
    if (!catalogSnap.exists) {
        throw new Error(`Item inconnu au catalogue : « ${itemId} »`);
    }

    const userRef = db.collection('users').doc(userId);
    const grantRef = userRef.collection('grants').doc(grantId);
    const inventoryRef = userRef.collection('inventory').doc(itemId);

    return db.runTransaction(async (tx) => {
        const [grantSnap, inventorySnap, userSnap] = await Promise.all([
            tx.get(grantRef),
            tx.get(inventoryRef),
            tx.get(userRef),
        ]);

        // Déjà traité : on ressort le résultat d'origine sans rien réécrire.
        if (grantSnap.exists) {
            const previous = grantSnap.data() as GrantRecord;
            return {
                granted: false,
                duplicate: previous.duplicate,
                alreadyProcessed: true,
                itemId,
                grantId,
            };
        }

        if (!userSnap.exists) {
            throw new Error(`Joueur introuvable : ${userId}`);
        }

        const duplicate = inventorySnap.exists;
        const now = Timestamp.now();

        // Un doublon EMPILE un exemplaire — décision de Sacha du 21/08 :
        // « au pire il ouvre le pack, c'est un item qu'il a déjà, bah tant pis
        // […] on peut en avoir plusieurs, comme ça peut-être qu'on mettra un
        // système d'échange après ».
        //
        // C'est ce qui donne une valeur au doublon sans avoir besoin d'une
        // monnaie : il devient de la matière à échanger.
        if (duplicate) {
            tx.update(inventoryRef, {
                quantity: readQuantity(inventorySnap.data()) + 1,
            });
        } else {
            tx.set(inventoryRef, {
                itemId,
                source,
                ...(sourceRef ? { sourceRef } : {}),
                grantedAt: now,
                quantity: 1,
            });
        }

        tx.set(grantRef, {
            grantId,
            itemId,
            source,
            ...(sourceRef ? { sourceRef } : {}),
            duplicate,
            addedCopy: true,
            grantedAt: now,
        });

        return { granted: !duplicate, duplicate, alreadyProcessed: false, itemId, grantId };
    });
}

/** Octroie plusieurs items d'affilée. Chaque octroi reste indépendamment idempotent. */
export async function grantItems(
    db: Firestore,
    userId: string,
    items: Array<Omit<GrantParams, 'userId'>>
): Promise<GrantResult[]> {
    const results: GrantResult[] = [];
    for (const item of items) {
        results.push(await grantItem(db, { ...item, userId }));
    }
    return results;
}

/** Les items possédés par un joueur. */
export async function getOwnedItemIds(db: Firestore, userId: string): Promise<string[]> {
    const snap = await db.collection('users').doc(userId).collection('inventory').get();
    return snap.docs.map(d => d.id);
}

/** Le catalogue entier, indexé par id. */
export async function getCatalog(db: Firestore): Promise<Record<string, CatalogItem>> {
    const snap = await db.collection('catalog').get();
    return Object.fromEntries(snap.docs.map(d => [d.id, d.data() as CatalogItem]));
}

// ═══════════════════════════════════════════════════════════════════════════
// RÉVOCATION — l'inverse de `grantItem`
// ═══════════════════════════════════════════════════════════════════════════
//
// Pourquoi ça existe : on doit pouvoir TESTER une clôture de saison sur les
// vraies données et revenir en arrière dix minutes plus tard. Sans marche
// arrière, tester une opération irréversible sur 141 comptes est impossible —
// et une opération jamais testée est une opération qui casse le jour J.
//
// La subtilité qui rend ça correct : `GrantRecord.duplicate` mémorise si le
// joueur POSSÉDAIT DÉJÀ l'item au moment de l'octroi. Révoquer un octroi
// « doublon » ne doit surtout pas retirer l'item de l'inventaire — le joueur
// l'avait avant, il n'y est pour rien.

// Les règles d'exemplaires vivent dans `quantity.ts`, PAS ici.
//
// Ce fichier importe `server-only` : tout ce qu'il exporte devient inaccessible
// au client. Or la page Collection a besoin de `readQuantity` pour afficher
// « x3 ». Les y laisser faisait remonter `server-only` jusqu'à un composant
// client et cassait la compilation.
//
// Ré-exportées ici pour que le code serveur garde un point d'entrée unique.
export { readQuantity, grantAddedACopy, afterRemovingOneCopy } from './quantity';

export interface RevokeResult {
    grantId: string;
    userId: string;
    itemId: string;
    /** Le dernier exemplaire a été retiré : l'item ne figure plus à l'inventaire. */
    removed: boolean;
    /** L'item était équipé : il a aussi été déséquipé. */
    unequipped: boolean;
    /** Aucun octroi de cet identifiant : rien à faire. */
    notFound: boolean;
}

/** Annule un octroi précis. Idempotent : révoquer deux fois ne casse rien. */
export async function revokeGrant(
    db: Firestore,
    userId: string,
    grantId: string
): Promise<RevokeResult> {
    const userRef = db.collection('users').doc(userId);
    const grantRef = userRef.collection('grants').doc(grantId);

    return db.runTransaction(async (tx) => {
        const grantSnap = await tx.get(grantRef);
        if (!grantSnap.exists) {
            return { grantId, userId, itemId: '', removed: false, unequipped: false, notFound: true };
        }

        const grant = grantSnap.data() as GrantRecord;
        const inventoryRef = userRef.collection('inventory').doc(grant.itemId);

        const [userSnap, inventorySnap] = await Promise.all([
            tx.get(userRef),
            tx.get(inventoryRef),
        ]);

        // Un octroi retire UN exemplaire, celui qu'il avait ajouté. Le document
        // ne disparaît que lorsqu'il ne reste plus rien : révoquer une ouverture
        // de pack ne doit pas effacer un item obtenu par ailleurs.
        const depile = grantAddedACopy(grant) && inventorySnap.exists;
        const { quantity, deleted } = depile
            ? afterRemovingOneCopy(readQuantity(inventorySnap.data()))
            : { quantity: 0, deleted: false };

        const equipped = { ...((userSnap.data()?.equipped ?? {}) as Record<string, { itemId: string }>) };

        // Un item dont il ne reste aucun exemplaire ne peut pas rester équipé :
        // sinon le joueur afficherait un cosmétique qu'il ne possède plus.
        let unequipped = false;
        if (deleted) {
            for (const [slot, value] of Object.entries(equipped)) {
                if (value?.itemId === grant.itemId) {
                    delete equipped[slot];
                    unequipped = true;
                }
            }
        }

        if (deleted) {
            tx.delete(inventoryRef);
        } else if (depile) {
            tx.update(inventoryRef, { quantity });
        }
        if (unequipped) {
            tx.update(userRef, { equipped });
        }
        tx.delete(grantRef);

        return { grantId, userId, itemId: grant.itemId, removed: deleted, unequipped, notFound: false };
    });
}

/**
 * Annule TOUS les octrois issus d'une même opération.
 *
 * C'est la marche arrière d'une clôture de saison : chaque octroi porte le
 * `sourceRef` de l'opération (ex. `season_0_close`), donc on retrouve
 * exactement ce qui a été distribué — et rien d'autre.
 *
 * ⚠️ Parcourt tous les joueurs. Réservé aux scripts admin, jamais à une route
 * HTTP : sur 150 comptes, ça dépasse le cadre d'une fonction serverless.
 */
export async function revokeBySourceRef(
    db: Firestore,
    sourceRef: string
): Promise<RevokeResult[]> {
    const users = await db.collection('users').get();
    const results: RevokeResult[] = [];

    for (const userDoc of users.docs) {
        const grants = await userDoc.ref
            .collection('grants')
            .where('sourceRef', '==', sourceRef)
            .get();

        for (const grant of grants.docs) {
            results.push(await revokeGrant(db, userDoc.id, grant.id));
        }
    }

    return results;
}
