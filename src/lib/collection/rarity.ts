/**
 * RARETÉ — affichage
 * Doc 30 : « la rareté pilote (a) la probabilité de tirage et (b) l'affichage
 * (couleur/bordure/effet — sortir un légendaire doit être visuellement un
 * événement) ».
 *
 * Ce module ne traite que (b). Les probabilités de tirage sont un point de
 * calibrage ouvert (D13) et vivront en config serveur, jamais ici.
 *
 * ⚠️ Les couleurs sont écrites en dur en attendant le chantier 5.1 (tokens).
 *    Quand `variables.css` sera réécrit, elles doivent y migrer comme le reste.
 */

import type { Rarity } from '@/types/collection';

export interface RarityConfig {
    rarity: Rarity;
    label: string;
    /** Couleur de bordure et d'accent. */
    color: string;
    /** Fond de la pastille de rareté. */
    background: string;
    /** Du plus commun au plus rare — sert au tri. */
    order: number;
}

export const RARITIES: Record<Rarity, RarityConfig> = {
    commun: {
        rarity: 'commun',
        label: 'Commun',
        color: '#9E9E9E',
        background: 'rgba(158, 158, 158, 0.18)',
        order: 1,
    },
    rare: {
        rarity: 'rare',
        label: 'Rare',
        color: '#4B7BFF',
        background: 'rgba(75, 123, 255, 0.18)',
        order: 2,
    },
    epique: {
        rarity: 'epique',
        label: 'Épique',
        color: '#9B59B6',
        background: 'rgba(155, 89, 182, 0.20)',
        order: 3,
    },
    legendaire: {
        rarity: 'legendaire',
        label: 'Légendaire',
        // Le jaune est réservé à « premier / important » (doc 10) : c'est
        // exactement ce qu'est un légendaire.
        color: '#F1C40F',
        background: 'rgba(241, 196, 15, 0.20)',
        order: 4,
    },
};

export function getRarityConfig(rarity: Rarity): RarityConfig {
    return RARITIES[rarity] ?? RARITIES.commun;
}

/** Tri d'affichage : les plus rares d'abord, puis par nom. */
export function compareByRarityDesc(
    a: { rarity: Rarity; meta: { name: string } },
    b: { rarity: Rarity; meta: { name: string } }
): number {
    const diff = getRarityConfig(b.rarity).order - getRarityConfig(a.rarity).order;
    return diff !== 0 ? diff : a.meta.name.localeCompare(b.meta.name);
}
