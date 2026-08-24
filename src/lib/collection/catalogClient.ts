/**
 * Lecture du catalogue côté client — chantier 2.1
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN CACHE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le catalogue est affiché partout : chaque ligne de classement lit la
 * bannière de son joueur. Sans cache, une page de classement à 50 lignes
 * déclencherait 50 lectures Firestore.
 *
 * Le catalogue est une donnée quasi-statique (on ajoute un item de temps en
 * temps) : on le charge UNE fois par session et on sert la suite en mémoire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN ACCÈS SYNCHRONE
 * ═══════════════════════════════════════════════════════════════════════════
 * Les composants d'affichage lisent leur item pendant le rendu. Les rendre
 * asynchrones imposerait de réécrire toute la chaîne d'affichage.
 * `getCachedItem()` est donc synchrone et renvoie `null` tant que le
 * catalogue n'est pas chargé — les appelants gèrent déjà ce cas, puisque
 * « pas de bannière » a toujours été un état valide.
 */

'use client';

import { collection, getDocs } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { getFirebaseDb } from '@/lib/firebase/config';
import type { CatalogItem, ItemType } from '@/types/collection';

let cache: Record<string, CatalogItem> | null = null;
let inFlight: Promise<Record<string, CatalogItem>> | null = null;
const subscribers = new Set<() => void>();

/** Charge le catalogue une seule fois. Les appels concurrents partagent la même promesse. */
export function loadCatalog(): Promise<Record<string, CatalogItem>> {
    if (cache) return Promise.resolve(cache);
    if (inFlight) return inFlight;

    inFlight = getDocs(collection(getFirebaseDb(), 'catalog'))
        .then(snap => {
            cache = Object.fromEntries(
                snap.docs.map(d => [d.id, { ...(d.data() as CatalogItem), id: d.id }])
            );
            subscribers.forEach(fn => fn());
            return cache;
        })
        .catch(err => {
            // Un catalogue indisponible ne doit jamais casser une page :
            // l'app s'affiche simplement sans cosmétiques.
            console.error('[catalog] chargement impossible', err);
            cache = {};
            subscribers.forEach(fn => fn());
            return cache;
        })
        .finally(() => { inFlight = null; });

    return inFlight;
}

/** Accès synchrone. `null` tant que le catalogue n'est pas chargé, ou si l'item n'existe pas. */
export function getCachedItem(itemId: string | null | undefined): CatalogItem | null {
    if (!itemId || !cache) return null;
    return cache[itemId] ?? null;
}

/** Tous les items d'un type donné, triés par nom. */
export function getCachedItemsByType(type: ItemType): CatalogItem[] {
    if (!cache) return [];
    return Object.values(cache)
        .filter(item => item.type === type)
        .sort((a, b) => a.meta.name.localeCompare(b.meta.name));
}

/** Vide le cache — utile après un ajout d'item côté admin. */
export function invalidateCatalog(): void {
    cache = null;
}

function subscribe(onChange: () => void): () => void {
    subscribers.add(onChange);
    // Le premier composant qui s'abonne déclenche le chargement ; les suivants
    // partagent la même promesse (voir `inFlight`).
    if (cache === null) loadCatalog();
    return () => { subscribers.delete(onChange); };
}

const isReady = () => cache !== null;
// Côté serveur, le catalogue n'est jamais chargé : on annonce « pas prêt »,
// et l'affichage retombe sur le repli statique de bannerUtils.
const isReadyOnServer = () => false;

/**
 * Déclenche le chargement du catalogue et re-rend le composant quand il arrive.
 * À appeler dans tout composant qui lit le catalogue.
 *
 * `useSyncExternalStore` est l'API prévue pour ça : elle branche un cache
 * externe sur le rendu React sans appeler `setState` depuis un effet.
 */
export function useCatalog(): { ready: boolean } {
    const ready = useSyncExternalStore(subscribe, isReady, isReadyOnServer);
    return { ready };
}
