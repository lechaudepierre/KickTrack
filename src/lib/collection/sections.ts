/**
 * DÉCOUPAGE DE LA PAGE COLLECTION.
 *
 * Jusqu'ici la page groupait uniquement par TYPE (bannières, titres…). Ça
 * mélangeait deux choses très différentes dans la même grille : ce qui se
 * gagne au hasard, et ce qui se mérite.
 *
 * Sacha, 21/08 : « tout ce qui est de saison, ils n'ont pas vraiment de
 * rareté, tu peux les mettre dans leur propre catégorie, comme ça on voit un
 * peu mieux ».
 *
 * Il a raison sur les deux points, et le second est le plus important :
 * **une récompense de saison n'a pas de rareté au sens du tirage.** Personne
 * ne « tire » un Grand Master : on l'atteint. Afficher « Légendaire » dessus
 * suggère une chance là où il n'y en a aucune. La pastille disparaît donc
 * dans ces sections.
 *
 * Les sections de saison passent APRÈS tous les types : on ouvre la page sur
 * ce qu'on peut obtenir maintenant, pas sur le palmarès de l'an dernier.
 *
 * Module pur : aucune dépendance à React ni à Firebase.
 */

import type { CatalogItem, SeasonGrade } from '@/types/collection';
import { getOrderedTypes, getTypeConfig } from './itemTypes';
import { compareByRarityDesc } from './rarity';
import { readObtention } from './packPool';
import { formatSeason } from './obtention';

export interface CollectionSection {
    /** Clé stable, sert aussi de valeur au filtre. */
    key: string;
    label: string;
    description: string;
    /**
     * La rareté a-t-elle un sens ici ?
     * Faux pour les saisons : on n'y tire rien, on y accède.
     */
    showRarity: boolean;
    /** Le type est-il rendu dans le jeu ? Faux = badge « Bientôt ». */
    available: boolean;
    items: CatalogItem[];
}

/** Progression des grades, du plus accessible au plus rare à atteindre. */
const ORDRE_GRADES: SeasonGrade[] = ['argent', 'or', 'diamant', 'master', 'grandmaster'];

function rangDansSaison(item: CatalogItem): number {
    const season = readObtention(item).season;
    // La participation vient en tête : tout le monde peut l'avoir, c'est
    // l'entrée de la progression, pas son sommet.
    if (season?.participation) return -1;
    const i = season?.grade ? ORDRE_GRADES.indexOf(season.grade) : -1;
    return i === -1 ? ORDRE_GRADES.length : i;
}

/** L'item appartient-il à une section de saison ? */
export function seasonOf(item: CatalogItem): string | null {
    return readObtention(item).season?.id ?? null;
}

/**
 * Construit les sections dans l'ordre d'affichage.
 * Une section sans aucun item n'est jamais renvoyée.
 */
export function buildSections(catalog: CatalogItem[]): CollectionSection[] {
    const sections: CollectionSection[] = [];

    // 1. Les types, dans leur ordre déclaré — hors récompenses de saison.
    for (const config of getOrderedTypes()) {
        const items = catalog
            .filter(i => i.type === config.type && !seasonOf(i))
            .sort(compareByRarityDesc);
        if (!items.length) continue;
        sections.push({
            key: config.type,
            label: config.labelPlural,
            description: config.description,
            showRarity: true,
            available: config.available,
            items,
        });
    }

    // 2. Les saisons, après tout le reste, de la plus récente à la plus ancienne.
    const parSaison = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
        const id = seasonOf(item);
        if (id) parSaison.set(id, [...(parSaison.get(id) ?? []), item]);
    }

    for (const id of [...parSaison.keys()].sort().reverse()) {
        const items = (parSaison.get(id) ?? []).sort(
            (a, b) => rangDansSaison(a) - rangDansSaison(b) || a.meta.name.localeCompare(b.meta.name)
        );
        const nom = formatSeason(id) ?? id;
        sections.push({
            key: `season:${id}`,
            label: nom.charAt(0).toUpperCase() + nom.slice(1),
            description: 'Attribuées automatiquement à la clôture. Elles ne s\'obtiennent pas autrement.',
            showRarity: false,
            // Une récompense de saison peut porter n'importe quel type. Elle
            // n'est équipable que si TOUS les types représentés le sont.
            available: items.every(i => getTypeConfig(i.type).available),
            items,
        });
    }

    return sections;
}
