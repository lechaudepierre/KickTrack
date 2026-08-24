/**
 * POST /api/inventory/equip — équipe (ou retire) un cosmétique.
 *
 * Doc 21 : « Équiper/déséquiper : action du client autorisée MAIS validée
 * (l'item doit être dans `owned`, du bon type ; le chapeau est le seul
 * déséquipable sans remplacement). »
 *
 * La validation vit ici et pas dans les règles Firestore : une règle ne peut
 * pas parcourir l'inventaire sans faire exploser le quota de `get()` par
 * requête. Le serveur, lui, lit l'inventaire librement.
 *
 * Corps attendu : { type: ItemType, itemId: string | null, tint?: string }
 *   itemId: null → retire l'item du slot (chapeau uniquement).
 */

import { NextResponse } from 'next/server';
import { getAdminDb, requireCallerUid, HttpError } from '@/lib/firebase/admin';
import {
    TINTABLE_TYPES,
    type CatalogItem,
    type ItemType,
    type Equipped,
} from '@/types/collection';
import { isDefaultItem } from '@/lib/collection/packPool';
import { getOrderedTypes } from '@/lib/collection/itemTypes';

/**
 * Les types équipables viennent du REGISTRE, pas d'une copie.
 *
 * DÉFAUT CORRIGÉ (22/08) : cette liste était écrite en dur et avait oublié
 * `title`. Équiper un titre répondait « Type d'item inconnu : title » — un
 * item qu'on peut gagner, voir et posséder, mais pas porter.
 *
 * C'est exactement ce que `ITEM_TYPES` existe pour éviter : son en-tête promet
 * qu'ajouter un type ne demande QU'UNE entrée de registre. Une liste en dur
 * ailleurs annule la promesse, et l'oubli ne se voit qu'à l'usage.
 *
 * Désormais, un nouveau type devient équipable sans qu'on touche à ce fichier.
 */
const VALID_TYPES: ItemType[] = getOrderedTypes().map(c => c.type);

/** Les slots qui peuvent rester vides — l'information vit dans le registre. */
const REMOVABLE_TYPES: ItemType[] = getOrderedTypes()
    .filter(c => c.optional)
    .map(c => c.type);

export async function POST(request: Request) {
    try {
        const uid = await requireCallerUid(request);
        const body = await request.json().catch(() => null);

        if (!body || typeof body !== 'object') {
            throw new HttpError(400, 'Corps de requête invalide');
        }

        const { type, itemId, tint } = body as { type?: string; itemId?: string | null; tint?: string };

        if (!type || !VALID_TYPES.includes(type as ItemType)) {
            throw new HttpError(400, `Type d'item inconnu : « ${type} »`);
        }
        const slot = type as ItemType;

        const db = getAdminDb();
        const userRef = db.collection('users').doc(uid);

        // ─── Retrait ──────────────────────────────────────────────────────────
        if (itemId === null || itemId === undefined) {
            if (!REMOVABLE_TYPES.includes(slot)) {
                throw new HttpError(400, `Le slot « ${slot} » ne peut pas rester vide`);
            }
            const snap = await userRef.get();
            const equipped = { ...((snap.data()?.equipped ?? {}) as Equipped) };
            delete equipped[slot];
            await userRef.update({ equipped });
            return NextResponse.json({ equipped });
        }

        // ─── Équipement ───────────────────────────────────────────────────────
        const [catalogSnap, inventorySnap, userSnap] = await Promise.all([
            db.collection('catalog').doc(itemId).get(),
            userRef.collection('inventory').doc(itemId).get(),
            userRef.get(),
        ]);

        if (!catalogSnap.exists) {
            throw new HttpError(404, 'Item inconnu au catalogue');
        }
        const item = catalogSnap.data() as CatalogItem;

        if (item.type !== slot) {
            throw new HttpError(400, `« ${item.meta?.name ?? itemId} » n'est pas un item de type ${slot}`);
        }

        // La vérification qui compte : on n'équipe que ce qu'on possède.
        //
        // Un item de base fait exception, et c'est le SEUL cas : il est possédé
        // par tout le monde sans figurer dans un inventaire. La règle vient du
        // CATALOGUE (`source: 'defaut'`), donc du serveur — un client ne peut
        // pas s'en réclamer pour équiper autre chose.
        if (!inventorySnap.exists && !isDefaultItem(item)) {
            throw new HttpError(403, 'Vous ne possédez pas cet item');
        }

        // La teinte n'existe que sur les slots tintables ET les items tintables.
        let appliedTint: string | undefined;
        if (tint) {
            if (!TINTABLE_TYPES.includes(slot) || !item.tintable) {
                throw new HttpError(400, `« ${item.meta?.name ?? itemId} » n'accepte pas de teinte`);
            }
            if (!/^#[0-9a-fA-F]{6}$/.test(tint)) {
                throw new HttpError(400, 'Teinte invalide (format attendu : #RRGGBB)');
            }
            appliedTint = tint;
        }

        const equipped: Equipped = {
            ...((userSnap.data()?.equipped ?? {}) as Equipped),
            [slot]: { itemId, ...(appliedTint ? { tint: appliedTint } : {}) },
        };

        // `bannerId` est l'ancien champ : on le garde synchronisé le temps de la
        // migration, pour qu'un client pas encore à jour continue d'afficher juste.
        const update: Record<string, unknown> = { equipped };
        if (slot === 'banner') update.bannerId = itemId;

        await userRef.update(update);

        return NextResponse.json({ equipped });
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        console.error('[POST /api/inventory/equip]', err);
        return NextResponse.json({ error: 'Erreur lors de l\'équipement' }, { status: 500 });
    }
}
