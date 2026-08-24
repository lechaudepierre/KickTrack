/**
 * Lecture de l'inventaire du joueur connecté — chantier 2.2 / 2.6.
 *
 * Lecture seule : les règles Firestore interdisent au client d'écrire dans
 * `inventory`. Toute acquisition passe par `grantItem` côté serveur, tout
 * équipement par POST /api/inventory/equip.
 */

'use client';

import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getFirebaseDb, getFirebaseAuth } from '@/lib/firebase/config';
import { loadCatalog, getCachedItem } from './catalogClient';
import type { CatalogItem, ItemType, Equipped } from '@/types/collection';

/** Items possédés par le joueur connecté, résolus contre le catalogue. */
export function useOwnedItems(type?: ItemType) {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const uid = getFirebaseAuth().currentUser?.uid;
            if (!uid) { setIsLoading(false); return; }

            try {
                await loadCatalog();
                const snap = await getDocs(
                    collection(getFirebaseDb(), 'users', uid, 'inventory')
                );
                if (cancelled) return;

                const owned = snap.docs
                    .map(d => getCachedItem(d.id))
                    // Un item possédé mais absent du catalogue est ignoré plutôt
                    // qu'affiché cassé — ça arrive si un item est retiré du catalogue.
                    .filter((i): i is CatalogItem => i !== null)
                    .filter(i => !type || i.type === type);

                setItems(owned);
            } catch (err) {
                console.error('[inventory] lecture impossible', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [type]);

    return { items, isLoading };
}

/** Équipe un item (ou vide le slot avec `itemId: null`). Retourne le nouvel `equipped`. */
export async function equipItem(
    type: ItemType,
    itemId: string | null,
    tint?: string
): Promise<Equipped> {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Vous devez être connecté');

    const response = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ type, itemId, ...(tint ? { tint } : {}) }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? 'Erreur lors de l\'équipement');

    return payload.equipped as Equipped;
}
