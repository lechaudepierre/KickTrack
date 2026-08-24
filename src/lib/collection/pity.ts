/**
 * LA GARANTIE ANTI-MALCHANCE — « pity », chantier 4.3b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PROBLÈME QUE ÇA RÉSOUT
 * ═══════════════════════════════════════════════════════════════════════════
 * Au tirage pur, un légendaire tombe dans **1,4 %** des packs — soit un pack
 * sur 72. À un pack toutes les dix parties qualifiantes, c'est **720 parties**
 * en moyenne pour un seul légendaire.
 *
 * Sacha, 24/08 : « c'est beaucoup trop ».
 *
 * Et « en moyenne » est trompeur : le hasard pur ne garantit rien. Un joueur
 * peut ouvrir cent packs sans rien voir. C'est ce que la garantie corrige —
 * pas la moyenne, la QUEUE de la distribution.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI INVISIBLE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le joueur ne voit aucun compteur. Il ne sait pas qu'il approche : il a
 * simplement l'impression d'avoir fini par avoir de la chance. Un compteur
 * affiché transformerait l'ouverture en calcul, et les packs « inutiles » en
 * corvée à expédier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ PROVISOIRE — le seuil n'est pas tranché
 * ═══════════════════════════════════════════════════════════════════════════
 * `SEUIL_PITY = 5` est la valeur donnée par Sacha le 24/08 : « toutes les cinq
 * packs… je me dis cinquante parties pour avoir un légendaire, c'est déjà
 * bien ».
 *
 * Relevé du 24/08 sur les 113 joueurs, pour situer ce que ça donne vraiment :
 *
 *   médiane           0 pack     — la moitié des joueurs n'en a jamais gagné
 *   1 pack ou plus   40 joueurs  (35 %)
 *   5 packs ou plus  11 joueurs  (10 %)
 *   25 packs          1 joueur   (le plus assidu)
 *
 * À 5, un joueur sur dix atteindrait la garantie. C'est défendable vu le peu
 * que la plupart jouent.
 *
 * ATTENTION: la vraie limite n'est pas le seuil, c'est qu'il n'existe que
 * **DEUX** items légendaires. Le joueur le plus assidu déclencherait la
 * garantie cinq fois et posséderait les deux dès sa dixième ouverture — le
 * reste ne serait plus que des doublons. Ajouter des légendaires vaudrait
 * mieux que remonter le seuil.
 *
 * Module pur : aucun accès Firestore, entièrement testable.
 */

import type { CatalogItem, Rarity } from '@/types/collection';

/** Nombre de packs sans légendaire au bout duquel le suivant en garantit un. */
export const SEUIL_PITY = 5; // PROVISOIRE — valeur de Sacha, 24/08

/** La rareté que la garantie force. */
export const RARETE_GARANTIE: Rarity = 'legendaire';

/**
 * Le compteur d'un joueur : combien de packs il a ouverts sans légendaire.
 *
 * Vit sur le profil, jamais renvoyé au client — c'est ce qui rend la garantie
 * invisible.
 */
export interface EtatPity {
    /** Packs ouverts depuis le dernier légendaire. */
    depuisLegendaire: number;
}

export const PITY_INITIAL: EtatPity = { depuisLegendaire: 0 };

/** Lecture tolérante : un profil d'avant cette mécanique n'a pas le champ. */
export function lirePity(valeur: unknown): EtatPity {
    const n = (valeur as EtatPity | undefined)?.depuisLegendaire;
    return { depuisLegendaire: typeof n === 'number' && n >= 0 ? Math.floor(n) : 0 };
}

/**
 * Ce pack doit-il garantir un légendaire ?
 *
 * Le compteur est celui d'AVANT l'ouverture. À `SEUIL_PITY = 5`, les packs 1 à
 * 4 tirent normalement et le cinquième garantit — soit un légendaire toutes
 * les cinq ouvertures au pire, plus tôt si le hasard a été bon.
 */
export function garantieDue(etat: EtatPity, seuil: number = SEUIL_PITY): boolean {
    if (seuil <= 0) return false;
    return etat.depuisLegendaire + 1 >= seuil;
}

/**
 * Le compteur après une ouverture.
 *
 * Un légendaire le remet à zéro, qu'il ait été garanti ou simplement tiré :
 * sinon la garantie s'enchaînerait juste après un coup de chance.
 */
export function pityApres(etat: EtatPity, rareteTiree: Rarity | undefined): EtatPity {
    return rareteTiree === RARETE_GARANTIE
        ? { depuisLegendaire: 0 }
        : { depuisLegendaire: etat.depuisLegendaire + 1 };
}

/**
 * Le pool dans lequel tirer, garantie comprise.
 *
 * Si la garantie est due ET qu'il existe au moins un légendaire tirable, on
 * restreint le pool. Sinon on rend le pool entier : une garantie qui ne peut
 * rien donner ne doit pas empêcher le pack de s'ouvrir.
 */
export function poolPourCeTirage(
    pool: readonly CatalogItem[],
    etat: EtatPity,
    seuil: number = SEUIL_PITY,
): CatalogItem[] {
    if (!garantieDue(etat, seuil)) return [...pool];
    const garantis = pool.filter(i => i.rarity === RARETE_GARANTIE);
    return garantis.length > 0 ? garantis : [...pool];
}
