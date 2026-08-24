/**
 * Résolution de la bannière à afficher — pont entre l'ancien système et le catalogue.
 * Chantier 2.5.
 *
 * Ordre de priorité, du plus explicite au plus implicite :
 *   1. `equipped.banner` — ce que le joueur a choisi (le futur)
 *   2. `bannerId` sur le profil — l'ancien champ, migré vers 1.
 *
 * L'étape 3 — l'attribution historique par pseudo — a disparu le 24/08 : elle
 * faisait perdre sa bannière à qui changeait de pseudo.
 *
 * À chaque étape, on tente d'abord le CATALOGUE, puis le repli statique de
 * `bannerUtils`. Une bannière absente du catalogue continue donc de s'afficher :
 * la migration peut se faire progressivement, sans écran cassé entre-temps.
 */

'use client';

import { getCachedItem } from './catalogClient';
import { getBannerConfig, resolveBannerId, getBannerScrimColor } from '@/lib/utils/bannerUtils';
import type { Equipped } from '@/types/collection';

export interface ResolvedBanner {
    path: string;
    textColor: string;
    scrimColor: string;
    /** Nom affichable, disponible seulement si l'item vient du catalogue. */
    name?: string;
}

/**
 * Le pseudo ne sert plus : il n'entre plus dans la résolution depuis que
 * l'attribution par pseudo a disparu (24/08). Paramètre retiré plutôt que
 * gardé « au cas où » — un argument qu'on passe sans qu'il serve finit par
 * faire croire qu'il compte.
 */
export function resolveBanner(
    bannerId?: string | null,
    equipped?: Equipped | null
): ResolvedBanner | null {
    const itemId = equipped?.banner?.itemId ?? resolveBannerId(bannerId);
    if (!itemId) return null;

    // 1. Le catalogue fait foi.
    const item = getCachedItem(itemId);
    if (item && item.type === 'banner') {
        const textColor = item.meta.textColor ?? '#ffffff';
        return {
            path: item.asset,
            textColor,
            scrimColor: getBannerScrimColor(textColor),
            name: item.meta.name,
        };
    }

    // 2. Repli statique — catalogue pas encore chargé, ou item absent.
    const fallback = getBannerConfig(itemId);
    if (!fallback) return null;

    return {
        path: fallback.path,
        textColor: fallback.textColor,
        scrimColor: getBannerScrimColor(fallback.textColor),
    };
}
