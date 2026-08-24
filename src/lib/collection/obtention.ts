/**
 * « Comment on obtient cet item ».
 *
 * Demande de Sacha (20 août) : « pour les items, il faudra les explications si
 * jamais elles s'obtiennent d'une manière spécifique ». C'est ce qui donne
 * envie de jouer pour débloquer — un item verrouillé sans explication n'est
 * qu'une frustration.
 *
 * Deux niveaux :
 *   1. `meta.description` du catalogue, quand quelqu'un a pris la peine de
 *      l'écrire. C'est toujours la meilleure réponse, et c'est de la DONNÉE :
 *      modifiable sans redéploiement.
 *   2. à défaut, une phrase déduite de la provenance. Correcte, mais générique.
 *
 * Module pur : aucune dépendance à React ni à Firebase.
 */

import type { CatalogItem, ItemSource, SeasonGrade } from '@/types/collection';
import { readObtention } from './packPool';

/** Phrase de repli quand le catalogue ne dit rien. */
const PAR_PROVENANCE: Record<ItemSource, string> = {
    pack: 'S\'obtient en ouvrant des packs.',
    saison: 'Récompense de fin de saison.',
    event: 'Distribué pendant un event. Plus disponible une fois l\'event terminé.',
    exploit: 'Se débloque en réalisant un exploit particulier.',
    createur: 'Réservé aux trois fondateurs de KickTracker.',
    defaut: 'Disponible pour tout le monde dès le départ.',
};

/** « season_1 » -> « saison 1 ». Renvoie null si le format n'est pas reconnu. */
export function formatSeason(season: string | undefined): string | null {
    if (!season) return null;
    const m = /^season_(\w+)$/.exec(season);
    return m ? `saison ${m[1]}` : season;
}

/** Libellés des grades de fin de saison. */
export const GRADE_LABELS: Record<SeasonGrade, string> = {
    argent: 'Argent',
    or: 'Or',
    diamant: 'Diamant',
    master: 'Master',
    grandmaster: 'Grand Master',
};

export interface Obtention {
    /** Phrase à afficher. */
    text: string;
    /**
     * La phrase vient-elle du catalogue (`true`) ou d'une règle déduite
     * (`false`) ? Permet de repérer les items dont l'explication reste à écrire.
     */
    authored: boolean;
    /**
     * L'item peut-il sortir d'un pack ?
     *
     * Affiché comme une mention À PART, jamais noyé dans la phrase : c'est
     * l'information qui distingue un cosmétique commun d'une récompense de
     * prestige, et c'est ce que le joueur regarde en premier.
     */
    fromPack: boolean;
}

export function describeObtention(item: CatalogItem): Obtention {
    const obtention = readObtention(item);
    const fromPack = obtention.pack;

    // Une règle d'attribution automatique bat une description écrite : elle
    // dit exactement ce qu'il faut faire, la prose ne peut qu'en dévier.
    const season = obtention.season;
    if (season?.grade) {
        const nom = formatSeason(season.id) ?? season.id;
        return {
            text: `Attribuée à la clôture de la ${nom} à tout joueur dont le meilleur grade `
                + `est ${GRADE_LABELS[season.grade]}.`,
            authored: true,
            fromPack,
        };
    }
    if (season?.rankRange) {
        const nom = formatSeason(season.id) ?? season.id;
        const [min, max] = season.rankRange;
        // Dérivé de la règle, pas recopié à la main : si les bornes changent,
        // la phrase suit. Une description écrite finit toujours par mentir.
        const place = min === max
            ? `arrivé ${min === 1 ? 'premier' : `${min}e`}`
            : `arrivés entre la ${min}e et la ${max}e place`;
        return {
            text: `Attribué à la clôture de la ${nom} au${min === max ? '' : 'x'} joueur${min === max ? '' : 's'} ${place} au classement général.`,
            authored: true,
            fromPack,
        };
    }
    if (season?.participation) {
        const nom = formatSeason(season.id) ?? season.id;
        return {
            text: `Attribuée à tout joueur ayant joué pendant la ${nom}.`,
            authored: true,
            fromPack,
        };
    }

    const written = item.meta.description?.trim();
    if (written) return { text: written, authored: true, fromPack };

    let text = PAR_PROVENANCE[item.source] ?? 'Provenance inconnue.';
    if (fromPack) text = PAR_PROVENANCE.pack;

    // Une récompense de saison sans règle gagne au moins à dire LAQUELLE.
    if (!fromPack && item.source === 'saison') {
        const nom = formatSeason(item.meta.season);
        if (nom) text = `Récompense de fin de ${nom}.`;
    }

    return { text, authored: false, fromPack };
}

/**
 * Items dont l'explication reste à écrire, et qui en ont vraiment besoin.
 *
 * Un item de pack ou de base se passe très bien de la phrase générique. Un
 * exploit ou un event, non : sans description, le joueur ne peut PAS savoir
 * quoi faire. Sert à repérer les trous du catalogue.
 */
export function needsWrittenExplanation(item: CatalogItem): boolean {
    if (item.meta.description?.trim()) return false;
    return item.source === 'exploit' || item.source === 'event';
}
