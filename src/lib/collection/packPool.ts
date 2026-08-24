/**
 * QUI PEUT SORTIR D'UN PACK, ET AVEC QUELLE CHANCE.
 *
 * Demande de Sacha (21/08) : « il y en a qui sont obtenables dans des packs
 * avec leurs probabilités relatives à leur rareté, mais il y en a qui seront
 * jamais obtenables dans un pack ».
 *
 * Deux règles, séparées volontairement :
 *   1. l'ÉLIGIBILITÉ est une propriété de l'item, portée par le catalogue —
 *      donc de la donnée, modifiable sans redéploiement ;
 *   2. le POIDS ne dépend que de la rareté — donc une seule table, et pas un
 *      réglage par item qu'il faudrait maintenir à cent entrées.
 *
 * Module pur, sans Firebase ni React : le tirage doit rester testable, et il
 * tournera côté serveur uniquement.
 */

import type { CatalogItem, ItemObtention, Rarity, SeasonGrade } from '@/types/collection';

/**
 * ⚠️ PROVISOIRE — poids relatifs par rareté.
 *
 * Ces valeurs se calibrent en regardant de vrais joueurs ouvrir de vrais packs.
 * Elles vivront en config serveur (bloc 4), pas ici. En attendant, elles
 * donnent un ordre de grandeur défendable : un légendaire reste un événement.
 */
export const POIDS_PAR_RARETE: Record<Rarity, number> = {
    commun: 60,
    rare: 25,
    epique: 12,
    legendaire: 3,
};

/**
 * Voie d'acquisition d'un item, avec repli sûr.
 *
 * Les items catalogués avant le 21/08 n'ont pas le champ. On ne SUPPOSE JAMAIS
 * qu'ils sont tirables : seuls ceux dont la provenance est explicitement `pack`
 * le sont. Se tromper dans ce sens ne fait que priver un pack d'un item ;
 * se tromper dans l'autre distribuerait une récompense de prestige au hasard.
 */
export function readObtention(item: CatalogItem): ItemObtention {
    if (item.obtention) return item.obtention;
    return { pack: item.source === 'pack' };
}

/**
 * L'item est-il acquis d'office par tout le monde ?
 *
 * Décision de Sacha (22/08) pour les bannières de cercle. Le point important
 * est qu'on ne les OCTROIE PAS : elles sont possédées sans figurer dans un
 * inventaire.
 *
 * Les distribuer réellement aurait écrit cinq documents pour chacun des 141
 * comptes, plus cinq de plus à chaque inscription — pour un droit que personne
 * ne peut perdre et que personne ne peut gagner. Un item de base n'est pas une
 * récompense : c'est une propriété du catalogue.
 */
export function isDefaultItem(item: Pick<CatalogItem, 'source'>): boolean {
    return item.source === 'defaut';
}

/** L'item peut-il sortir d'un pack ? */
export function isPackEligible(item: CatalogItem): boolean {
    return readObtention(item).pack;
}

/** Les items qu'un pack peut donner. */
export function buildPackPool(catalog: CatalogItem[]): CatalogItem[] {
    return catalog.filter(isPackEligible);
}

/** Poids de tirage d'un item. Zéro s'il n'est pas éligible. */
export function weightOf(item: CatalogItem): number {
    return isPackEligible(item) ? (POIDS_PAR_RARETE[item.rarity] ?? 0) : 0;
}

/**
 * Tire un item dans un pool.
 *
 * @param random source d'aléa dans [0, 1[. Injectée pour que le tirage soit
 *        REPRODUCTIBLE en test — et parce qu'il tournera côté serveur, où
 *        l'aléa doit rester sous notre contrôle.
 * @returns l'item tiré, ou `null` si le pool ne contient rien de tirable.
 */
export function drawFromPool(pool: CatalogItem[], random: () => number): CatalogItem | null {
    const tirables = pool.filter(isPackEligible);
    const total = tirables.reduce((sum, i) => sum + weightOf(i), 0);
    if (total <= 0) return null;

    // `random()` peut valoir exactement 0 mais jamais 1 : le curseur reste
    // strictement sous le total, donc la dernière entrée est atteignable
    // sans qu'on puisse déborder du tableau.
    let curseur = random() * total;
    for (const item of tirables) {
        curseur -= weightOf(item);
        if (curseur < 0) return item;
    }
    // Filet contre une erreur d'arrondi en virgule flottante.
    return tirables[tirables.length - 1];
}

/**
 * Chance de tirer chaque rareté dans un pool donné, en pourcentage.
 * Sert à afficher les probabilités, et à vérifier une calibration d'un coup d'œil.
 */
export function rarityOdds(pool: CatalogItem[]): Record<Rarity, number> {
    const odds: Record<Rarity, number> = { commun: 0, rare: 0, epique: 0, legendaire: 0 };
    const tirables = pool.filter(isPackEligible);
    const total = tirables.reduce((sum, i) => sum + weightOf(i), 0);
    if (total <= 0) return odds;

    for (const item of tirables) {
        odds[item.rarity] += (weightOf(item) / total) * 100;
    }
    return odds;
}

/**
 * Les items qu'une clôture de saison doit distribuer, par grade.
 *
 * « Au moment de la saison, tout le monde aura sa bannière relative au rang
 * maximum qu'il a eu » — un joueur reçoit UNE bannière, celle de son meilleur
 * grade. Cette fonction donne la table de correspondance grade -> item.
 */
export function seasonGradeAwards(catalog: CatalogItem[], seasonId: string): Map<string, CatalogItem> {
    const table = new Map<string, CatalogItem>();
    for (const item of catalog) {
        const season = readObtention(item).season;
        if (season?.id === seasonId && season.grade) {
            table.set(season.grade, item);
        }
    }
    return table;
}

/**
 * TOUS les items dus à un joueur à la clôture d'une saison.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES GRADES SE CUMULENT VERS LE BAS
 * ═══════════════════════════════════════════════════════════════════════════
 * Décision de Sacha (22/08) : « tout ce qui est items des rangs qui sont en
 * dessous du rang que j'ai obtenu, je les débloque aussi. Je ne débloque pas
 * que le mien, mais pas ceux au-dessus. »
 *
 * Finir Master donne donc Argent, Or, Diamant ET Master — pas Grand Master.
 * C'est la bonne façon de le faire : sans ça, atteindre un palier ferait
 * PERDRE la récompense du palier précédent, et un joueur qui progresse
 * verrait sa collection rétrécir.
 *
 * @param grade place finale au classement de grade, ou `null` si le joueur n'a
 *        pas de grade (aucune partie).
 * @param rank  place finale au classement, 1 = premier. `null` si non classé.
 */
export function seasonAwardsFor(
    catalog: CatalogItem[],
    seasonId: string,
    opts: { grade?: SeasonGrade | null; rank?: number | null; participated: boolean },
): CatalogItem[] {
    const atteint = opts.grade ? ORDRE_GRADES.indexOf(opts.grade) : -1;

    return catalog.filter(item => {
        const season = readObtention(item).season;
        if (season?.id !== seasonId) return false;

        // Participation : tout le monde, dès une partie jouée.
        if (season.participation) return opts.participated;

        // Place finale : bornes incluses.
        if (season.rankRange) {
            const [min, max] = season.rankRange;
            return opts.rank !== null && opts.rank !== undefined
                && opts.rank >= min && opts.rank <= max;
        }

        // Grade : celui atteint, et TOUS ceux d'en dessous.
        if (season.grade) {
            const requis = ORDRE_GRADES.indexOf(season.grade);
            return atteint >= 0 && requis >= 0 && requis <= atteint;
        }

        return false;
    });
}

/** Ordre des grades, du plus accessible au plus difficile. */
const ORDRE_GRADES: SeasonGrade[] = ['argent', 'or', 'diamant', 'master', 'grandmaster'];

/** Les items distribués à TOUT participant d'une saison, quel que soit le grade. */
export function seasonParticipationAwards(catalog: CatalogItem[], seasonId: string): CatalogItem[] {
    return catalog.filter(item => {
        const season = readObtention(item).season;
        return season?.id === seasonId && season.participation === true;
    });
}
