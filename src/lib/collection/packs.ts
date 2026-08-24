/**
 * PACKS — octroi et ouverture. Côté serveur exclusivement.
 *
 * Le client ne s'attribue jamais rien de valeur : il ne peut ni créer un pack,
 * ni décider de son contenu. Les règles Firestore interdisent l'écriture sur
 * `users/{uid}/packs`, et tout passe par ici.
 *
 * Les RÈGLES de calcul vivent dans `packEarning.ts` et `packPool.ts`, qui sont
 * purs et testés. Ce module ne fait que les appliquer à la base.
 */

import 'server-only';

import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { CatalogItem } from '@/types/collection';
import { computePackEarning, packIdsToCreate } from './packEarning';
import { drawFromPool, buildPackPool } from './packPool';
import { lirePity, pityApres, poolPourCeTirage } from './pity';
import { grantItem } from './grant';

export interface GrantPacksResult {
    /** Identifiants des packs créés. Vide si rien n'était dû. */
    created: string[];
    /** Packs non ouverts après l'opération. */
    unopened: number;
}

/**
 * Octroie les packs dus à un joueur d'après ses parties jouées.
 *
 * Idempotent de deux façons, indépendantes :
 *   - le calcul est une DÉRIVATION du total de parties, pas un incrément ;
 *   - les identifiants sont déterministes, donc réécrire le même document
 *     n'ajoute rien.
 *
 * Ne lève jamais : un pack manqué ne doit pas faire échouer une fin de partie.
 */
export async function grantEarnedPacks(
    db: Firestore,
    userId: string,
    /**
     * Parties QUALIFIANTES jouées (`stats.packGames`), pas `totalGames`.
     * C'est un compteur neuf, à zéro pour tout le monde : l'historique
     * n'entre donc pas dans le calcul, sans réglage particulier.
     */
    packGames: number,
): Promise<GrantPacksResult> {
    const userRef = db.collection('users').doc(userId);

    try {
        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) return { created: [], unopened: 0 };

            const data = snap.data() ?? {};
            const earning = computePackEarning(packGames, {
                granted: data.packsGranted,
                baseline: data.packsBaseline,
            });

            const ids = packIdsToCreate(earning);
            const now = Timestamp.now();

            for (let i = 0; i < ids.length; i++) {
                tx.set(userRef.collection('packs').doc(ids[i]), {
                    index: earning.newPacksGranted - earning.toGrant + 1 + i,
                    earnedAt: now,
                });
            }

            const unopened = Math.max(0, (data.packsUnopened ?? 0) + ids.length);

            // Le repère et le compteur de non-ouverts sont écrits même quand
            // rien n'est créé : c'est ce premier passage qui pose la ligne de
            // départ du joueur.
            tx.update(userRef, {
                packsGranted: earning.newPacksGranted,
                packsBaseline: earning.baseline,
                packsUnopened: unopened,
            });

            return { created: ids, unopened };
        });
    } catch (err) {
        // Un pack manqué se rattrape tout seul à la partie suivante, puisque
        // le calcul dérive du total. Faire échouer la clôture serait bien pire.
        console.error(`[packs] octroi impossible pour ${userId} :`, err);
        return { created: [], unopened: 0 };
    }
}

export interface OpenPackResult {
    packId: string;
    itemId: string;
    /** Le joueur possédait déjà cet item : un exemplaire de plus. */
    duplicate: boolean;
    /** Le pack était déjà ouvert : on ressort le même résultat. */
    alreadyOpened: boolean;
}

/**
 * Ouvre un pack et octroie son contenu.
 *
 * L'ordre compte : le tirage est ÉCRIT sur le document du pack avant tout le
 * reste. Rafraîchir en pleine animation retombe donc sur le même item — on ne
 * peut pas relancer le tirage jusqu'à obtenir un légendaire.
 *
 * L'octroi se fait APRÈS la transaction, parce que `grantItem` a la sienne.
 * Il est lui-même idempotent (`grantId` déterministe), et on le rejoue même
 * sur un pack déjà ouvert : si le processus était tombé entre les deux, le
 * joueur récupère son item à la tentative suivante au lieu de le perdre.
 */
export async function openPack(
    db: Firestore,
    userId: string,
    packId: string,
): Promise<OpenPackResult> {
    const userRef = db.collection('users').doc(userId);
    const packRef = userRef.collection('packs').doc(packId);

    const catalogSnap = await db.collection('catalog').get();
    const pool = buildPackPool(catalogSnap.docs.map(d => ({ id: d.id, ...d.data() }) as CatalogItem));

    const { itemId, alreadyOpened } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(packRef);
        if (!snap.exists) throw new Error('Pack introuvable');

        const pack = snap.data() ?? {};
        if (pack.itemId) return { itemId: pack.itemId as string, alreadyOpened: true };

        const userSnap = await tx.get(userRef);

        /*
         * La garantie anti-malchance — chantier 4.3b.
         *
         * Le compteur est lu DANS la transaction, avec le pack : deux
         * ouvertures simultanées ne peuvent donc pas déclencher la garantie
         * deux fois sur le même compteur.
         *
         * Il n'est jamais renvoyé au client. C'est ce qui la rend invisible :
         * le joueur ne sait pas qu'il approche, il a juste l'impression
         * d'avoir fini par avoir de la chance.
         */
        const pity = lirePity(userSnap.data()?.pity);
        const tire = drawFromPool(poolPourCeTirage(pool, pity), Math.random);
        if (!tire) throw new Error('Aucun item tirable au catalogue');

        const unopened = Math.max(0, (userSnap.data()?.packsUnopened ?? 1) - 1);

        tx.update(packRef, { openedAt: Timestamp.now(), itemId: tire.id });
        tx.update(userRef, {
            packsUnopened: unopened,
            pity: pityApres(pity, tire.rarity),
        });

        return { itemId: tire.id, alreadyOpened: false };
    });

    const grant = await grantItem(db, {
        userId,
        itemId,
        source: 'pack',
        // `sourceRef` distinct par pack : sans lui, deux ouvertures donnant le
        // même item porteraient le même `grantId` et la seconde serait ignorée.
        sourceRef: packId,
    });

    return { packId, itemId, duplicate: grant.duplicate, alreadyOpened };
}
