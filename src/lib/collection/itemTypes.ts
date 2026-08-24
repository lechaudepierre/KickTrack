/**
 * REGISTRE DES TYPES D'ITEMS — le point d'extension du système de personnalisation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * AJOUTER UN NOUVEAU TYPE DE COLLECTABLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 1. ajouter la valeur à `ItemType` dans `src/types/collection.ts`
 * 2. ajouter une entrée ici
 * 3. c'est tout.
 *
 * Le catalogue, l'inventaire, `grantItem`, la révocation, la page Collection
 * et l'équipement fonctionnent SANS RIEN SAVOIR du type concerné. Ils lisent
 * ce registre. Aucun `if (type === 'banner')` ne doit exister ailleurs.
 *
 * C'est ce qui rend la promesse tenable : « et si ça se trouve d'autres choses
 * dans le futur ». Un type = une ligne de configuration, pas un chantier.
 */

import type { ItemType } from '@/types/collection';

export interface ItemTypeConfig {
    type: ItemType;
    /** Nom affiché, au singulier. */
    label: string;
    /** Nom affiché, au pluriel — titres de section de la page Collection. */
    labelPlural: string;
    description: string;
    /**
     * Fait partie de la figurine (doc 21 : 5 slots empilés dans un ordre fixe) ?
     * Les items hors figurine (bannière…) s'affichent et s'équipent seuls.
     */
    isFigurineSlot: boolean;
    /** Le slot peut-il rester vide ? */
    optional: boolean;
    /** Le slot accepte-t-il une teinte par-dessus la forme de l'item ? */
    tintable: boolean;
    /** Comment prévisualiser un item de ce type dans la page Collection. */
    preview: 'wide-image' | 'square-image' | 'text' | 'animation' | 'sound';
    /** Ordre d'affichage dans la page Collection. */
    order: number;
    /**
     * Le type est-il exploitable aujourd'hui ?
     * `false` = déclaré, catalogue prêt, mais rendu pas encore implémenté.
     * La page Collection le montre alors comme « bientôt ».
     */
    available: boolean;
}

export const ITEM_TYPES: Record<ItemType, ItemTypeConfig> = {
    banner: {
        type: 'banner',
        label: 'Bannière',
        labelPlural: 'Bannières',
        description: 'Le fond affiché derrière ton pseudo, sur ton profil et dans les classements.',
        isFigurineSlot: false,
        optional: true,
        tintable: false,
        preview: 'wide-image',
        order: 1,
        available: true,
    },
    title: {
        type: 'title',
        label: 'Titre',
        labelPlural: 'Titres',
        description: 'Un titre affiché à côté de ton pseudo. Purement déclaratif, comme tout le reste.',
        isFigurineSlot: false,
        optional: true,
        tintable: false,
        preview: 'text',
        order: 2,
        available: true,
    },
    corps: {
        type: 'corps',
        label: 'Corps',
        labelPlural: 'Corps',
        description: 'La silhouette de ta figurine.',
        isFigurineSlot: true,
        optional: false,
        tintable: true,
        preview: 'square-image',
        order: 3,
        available: false,
    },
    maillot: {
        type: 'maillot',
        label: 'Maillot',
        labelPlural: 'Maillots',
        description: 'Le haut de ta figurine.',
        isFigurineSlot: true,
        optional: false,
        tintable: true,
        preview: 'square-image',
        order: 4,
        available: false,
    },
    short: {
        type: 'short',
        label: 'Short',
        labelPlural: 'Shorts',
        description: 'Le bas de ta figurine.',
        isFigurineSlot: true,
        optional: false,
        tintable: true,
        preview: 'square-image',
        order: 5,
        available: false,
    },
    pieds: {
        type: 'pieds',
        label: 'Chaussures',
        labelPlural: 'Chaussures',
        description: 'Les pieds de ta figurine.',
        isFigurineSlot: true,
        optional: false,
        tintable: false,
        preview: 'square-image',
        order: 6,
        available: false,
    },
    chapeau: {
        type: 'chapeau',
        label: 'Chapeau',
        labelPlural: 'Chapeaux',
        description: 'Le seul accessoire optionnel de la figurine.',
        isFigurineSlot: true,
        optional: true,
        tintable: false,
        preview: 'square-image',
        order: 7,
        available: false,
    },
};

/** Types dans l'ordre d'affichage. */
export function getOrderedTypes(): ItemTypeConfig[] {
    return Object.values(ITEM_TYPES).sort((a, b) => a.order - b.order);
}

export function getTypeConfig(type: ItemType): ItemTypeConfig {
    return ITEM_TYPES[type];
}
