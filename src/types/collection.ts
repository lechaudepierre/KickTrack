/**
 * SOCLE COLLECTION — modèle de données
 * Doc/v2-refactor/20-socle-collection.md · chantiers 2.1 à 2.4
 *
 * Quatre zones, volontairement séparées :
 *   1. CATALOGUE   collection partagée, lecture seule côté client
 *   2. INVENTAIRE  sous-collection du user, écriture serveur uniquement
 *   3. EQUIPPED    sur le profil user — quelques IDs, c'est tout
 *   4. OCTROIS     journal d'idempotence, écriture serveur uniquement
 *
 * ⚠️ INVARIANTS À NE JAMAIS ENFREINDRE
 *   • Les items sont 100 % COSMÉTIQUES. Aucun ne donne d'avantage en jeu. Jamais.
 *   • Le profil user reste LÉGER : seul `equipped` s'y ajoute, car c'est ce
 *     qu'on lit pour afficher n'importe qui dans un classement. L'inventaire
 *     complet vit en sous-collection et peut grossir sans conséquence.
 *   • Les données sont INDÉPENDANTES DU MOTEUR DE RENDU. Un item porte une
 *     forme et une référence d'asset, jamais une spécificité de rendu.
 *     C'est ce qui permettra de passer la figurine de 2D à 3D sans toucher
 *     ni au catalogue, ni aux inventaires, ni à `equipped` (doc 21).
 */

/** Slots de la figurine (doc 21 : 5 slots figés) + les cosmétiques hors figurine. */
export type ItemType =
    | 'corps'
    | 'maillot'
    | 'short'
    | 'pieds'
    | 'chapeau'
    | 'banner'
    | 'title';

/** Seuls ces slots acceptent une teinte (doc 21). */
export const TINTABLE_TYPES: ItemType[] = ['corps', 'maillot', 'short'];

/** Le chapeau est le seul slot de figurine qui peut rester vide (doc 21). */
export const OPTIONAL_TYPES: ItemType[] = ['chapeau'];

/** Les 4 tiers de rareté (doc 30). Pilotent tirage et affichage. */
export type Rarity = 'commun' | 'rare' | 'epique' | 'legendaire';

/**
 * Provenance autorisée d'un item.
 * `pack` est la seule source tirable au hasard : tout le reste est du prestige,
 * et c'est précisément ce qui lui donne sa valeur (doc 30).
 */
export type ItemSource =
    | 'pack'
    | 'saison'
    | 'event'
    | 'exploit'
    | 'createur'
    | 'defaut';

/**
 * Grade de fin de saison ouvrant droit à une bannière.
 * ⚠️ Doit rester aligné sur `RankType` de `lib/utils/rankUtils.ts`.
 */
export type SeasonGrade = 'argent' | 'or' | 'diamant' | 'master' | 'grandmaster';

/**
 * COMMENT S'OBTIENT UN ITEM — la règle, pas la prose.
 *
 * `source` dit d'où vient l'item historiquement. Ça ne suffisait pas : Sacha
 * (21/08) veut que chaque item porte sa VOIE D'ACQUISITION, parce que toutes
 * ne se valent pas.
 *
 *   - certains tombent des packs, avec un poids qui suit leur rareté ;
 *   - certains ne tomberont JAMAIS d'un pack — c'est ce qui fait leur valeur ;
 *   - certains s'attribuent tout seuls à la clôture d'une saison, à tous ceux
 *     qui ont atteint un grade donné.
 *
 * C'est de la DONNÉE : changer la voie d'acquisition d'un item ne demande
 * aucun redéploiement.
 */
export interface ItemObtention {
    /**
     * L'item peut-il sortir d'un pack ?
     *
     * Volontairement indépendant de `source` : une bannière de créateur a
     * `source: 'createur'` ET `pack: false`, mais rien n'interdirait un item
     * de saison de repasser en pack l'année suivante.
     */
    pack: boolean;
    /**
     * Attribution automatique à la clôture d'une saison.
     * Présent = l'item se distribue tout seul, sans que personne l'ouvre.
     */
    season?: {
        /** Identifiant de saison, ex. `season_0`. */
        id: string;
        /**
         * Grade MAXIMUM atteint pendant la saison qui ouvre droit à cet item.
         * Un joueur reçoit la bannière de son meilleur grade, une seule.
         */
        grade?: SeasonGrade;
        /** Attribué à tout participant, quel que soit son grade. */
        participation?: boolean;
        /**
         * Place finale au classement ouvrant droit à l'item, bornes incluses.
         *
         * `[1, 1]` = le champion, `[2, 3]` = le reste du podium.
         * Séparé de `grade` : une place est un rang de fin de saison, un grade
         * est un palier d'ELO. Un joueur peut être Grand Master sans finir
         * premier.
         */
        rankRange?: [number, number];
    };
}

/** Une entrée du catalogue — `catalog/{itemId}` */
export interface CatalogItem {
    id: string;
    type: ItemType;
    rarity: Rarity;
    source: ItemSource;
    /**
     * Voie d'acquisition. Absent sur les items catalogués avant le 21/08 :
     * toujours passer par `readObtention()`, qui déduit une valeur sûre de
     * `source` plutôt que de supposer qu'un item est tirable.
     */
    obtention?: ItemObtention;
    /** Référence du visuel. Chemin sous /public aujourd'hui, modèle 3D demain. */
    asset: string;
    /** L'item accepte-t-il une teinte par-dessus sa forme ? */
    tintable: boolean;
    meta: {
        name: string;
        description?: string;
        /** Saison d'origine, pour les items de prestige. */
        season?: string;
        /**
         * Couleur du texte affiché par-dessus, pour les bannières.
         * Propriété d'affichage de l'asset, pas du moteur.
         */
        textColor?: string;
        /**
         * Texte affiché, pour les items de type `title`.
         * Un titre n'a pas d'asset : son `asset` reste vide, c'est ce champ
         * qui porte le contenu (ex. « Champion saison 0 »).
         */
        text?: string;
    };
}

/** Un item possédé — `users/{uid}/inventory/{itemId}` */
export interface InventoryItem {
    itemId: string;
    source: ItemSource;
    /** Référence de l'origine : id de saison, d'event, de pack ouvert… */
    sourceRef?: string;
    grantedAt: Date;
    /**
     * Nombre d'exemplaires possédés.
     *
     * Décision de Sacha (21/08) : ouvrir un pack et retomber sur un item déjà
     * possédé n'est PAS un échec — le doublon s'empile, en vue d'un futur
     * système d'échange entre joueurs.
     *
     * Les documents créés avant cette date n'ont pas le champ. Toujours passer
     * par `readQuantity()` : absent vaut UN exemplaire, jamais zéro.
     */
    quantity?: number;
}

/** Un item équipé sur un slot. La teinte n'existe que sur les slots tintables. */
export interface EquippedItem {
    itemId: string;
    /** Couleur CSS appliquée par-dessus la forme. Slots tintables uniquement. */
    tint?: string;
}

/**
 * Ce qui est équipé — stocké sur le document user.
 * Volontairement minuscule : c'est lu pour chaque ligne de classement.
 */
export type Equipped = Partial<Record<ItemType, EquippedItem>>;

/**
 * Trace d'octroi — `users/{uid}/grants/{grantId}`
 *
 * C'est le mécanisme d'idempotence : `grantId` est déterministe, donc rejouer
 * un octroi après un crash ne peut pas doubler quoi que ce soit. La clôture de
 * saison en dépend directement (doc 31 : « chaque joueur reçoit sa récompense
 * exactement une fois »).
 */
export interface GrantRecord {
    grantId: string;
    itemId: string;
    source: ItemSource;
    sourceRef?: string;
    /** L'item était déjà possédé au moment de l'octroi. */
    duplicate: boolean;
    /**
     * Cet octroi a-t-il ajouté un exemplaire à l'inventaire ?
     *
     * Vaut toujours `true` depuis le 21/08 : chaque octroi empile un
     * exemplaire, doublon compris. Absent sur les octrois antérieurs, où un
     * doublon n'ajoutait rien — d'où la lecture prudente dans
     * `grantAddedACopy()`, qui décide si la révocation doit décrémenter.
     */
    addedCopy?: boolean;
    grantedAt: Date;
}

/**
 * Un pack non ouvert — `users/{uid}/packs/{packId}`
 *
 * Écrit exclusivement par le serveur. L'identifiant est déterministe
 * (`pack_7` = septième pack de ce joueur), ce qui rend l'octroi rejouable
 * sans risque de doublon.
 */
export interface PackInstance {
    /** Rang du pack dans l'historique du joueur. */
    index: number;
    earnedAt: Date;
    /** Partie qui l'a déclenché, pour pouvoir remonter la piste. */
    sourceRef?: string;
    /** Ouvert quand ce champ existe. */
    openedAt?: Date;
    /**
     * Item tiré, écrit AVANT que l'animation démarre.
     *
     * C'est ce qui empêche de relancer le tirage en rafraîchissant en plein
     * milieu de l'ouverture : le résultat est déjà décidé et mémorisé.
     */
    itemId?: string;
}
