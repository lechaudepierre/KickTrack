/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE CATALOGUE — source de vérité, versionnée dans git
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pour ajouter un item : ajouter une entrée ici, déposer son fichier dans
 * `public/`, puis lancer :
 *
 *     npm run catalog:sync              # montre ce qui changerait
 *     npm run catalog:sync -- --apply   # applique
 *
 * C'est tout. Pas de redéploiement de l'app, pas de code à toucher.
 *
 * ── Champs ─────────────────────────────────────────────────────────────────
 *   id        identifiant stable. NE JAMAIS LE CHANGER une fois distribué :
 *             c'est la clé de l'inventaire des joueurs.
 *   type      banner | title | corps | maillot | short | pieds | chapeau
 *   rarity    commun | rare | epique | legendaire
 *   source    saison | event | exploit | createur | pack | defaut
 *   asset     chemin sous /public. Vide pour un titre (il n'a pas de visuel).
 *   tintable  accepte une teinte par-dessus sa forme (corps/maillot/short only)
 *   meta.name         nom affiché
 *   meta.description  optionnel
 *   meta.season       optionnel, ex. 'season_0'
 *   meta.textColor    bannières : couleur du pseudo affiché par-dessus
 *   meta.text         titres : le texte affiché
 */

const banner = (id, name, opts = {}) => ({
    id,
    type: 'banner',
    rarity: opts.rarity ?? 'commun',
    source: opts.source ?? 'saison',
    asset: opts.asset ?? `/banners/${id}.webp`,
    tintable: false,
    // Voie d'acquisition. `pack: false` par défaut : on n'ouvre JAMAIS une
    // porte par omission. Un item de prestige distribué par erreur dans un
    // pack ne se rattrape pas.
    obtention: opts.obtention ?? { pack: false },
    meta: {
        name,
        textColor: opts.textColor ?? '#ffffff',
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.season ? { season: opts.season } : {}),
    },
});

const title = (id, text, opts = {}) => ({
    id,
    type: 'title',
    rarity: opts.rarity ?? 'rare',
    source: opts.source ?? 'saison',
    asset: '',
    tintable: false,
    obtention: opts.obtention ?? { pack: false },
    meta: {
        name: text,
        text,
        ...(opts.description ? { description: opts.description } : {}),
        ...(opts.season ? { season: opts.season } : {}),
    },
});

export const CATALOG = [
    // ─── Prestige : ne sortiront JAMAIS d'un pack ────────────────────────────
    // C'est précisément ce qui leur donne leur valeur. `pack: false`.
    //
    // ⚠️ PROVISOIRE — `creator` affiche `hero-planet.webp` depuis que
    //    `CreatorV3.png` a été retiré. Trois joueurs possèdent l'item, donc
    //    l'identifiant ne peut pas bouger, mais le visuel mériterait d'être
    //    le sien plutôt qu'une bannière du lot commun.
    banner('creator', 'Fondateur', {
        rarity: 'legendaire', source: 'createur',
        asset: '/banners/hero-planet.webp',
        description: 'Réservée aux trois fondateurs de KickTracker.',
    }),
    // ⚠️ Format à refaire : 1500 x 300 en PNG, au lieu de 1800 x 400 en WebP.
    //    C'est la dernière bannière au mauvais format.
    banner('veloTDF', 'Vélo TDF', {
        rarity: 'commun', source: 'exploit',
        asset: '/banners/VéloTDF.png',
        description: 'Conçue spécialement pour Germimoche.',
    }),

    // ─── Récompenses de la saison 0 ──────────────────────────────────────────
    // Distribuées automatiquement à la clôture. Chaque joueur reçoit LA
    // bannière de son meilleur grade — la règle vit dans `obtention.season`,
    // pas dans du code.
    banner('pionnier_s0', 'Pionnier', {
        rarity: 'rare', season: 'season_0',
        asset: '/banners/pionnier.webp',
        obtention: { pack: false, season: { id: 'season_0', participation: true } },
    }),
    banner('grade_argent_s0', 'Argent — Saison 0', {
        rarity: 'commun', season: 'season_0',
        asset: '/banners/s0-silver.webp',
        obtention: { pack: false, season: { id: 'season_0', grade: 'argent' } },
    }),
    banner('grade_or_s0', 'Or — Saison 0', {
        rarity: 'rare', season: 'season_0',
        asset: '/banners/s0-gold.webp',
        obtention: { pack: false, season: { id: 'season_0', grade: 'or' } },
    }),
    banner('grade_diamant_s0', 'Diamant — Saison 0', {
        rarity: 'epique', season: 'season_0',
        asset: '/banners/s0-diamond.webp',
        obtention: { pack: false, season: { id: 'season_0', grade: 'diamant' } },
    }),
    // « emerald » n'est pas un nom de palier, mais c'est la seule affectation
    // possible : cinq fichiers, cinq grades, et les quatre autres sont sans
    // ambiguïté (silver/gold/diamond/grand-master). Confirmé par Sacha le
    // 21/08 : « emerald, ce n'était pas diamant ».
    banner('grade_master_s0', 'Master — Saison 0', {
        rarity: 'epique', season: 'season_0',
        asset: '/banners/s0-emerald.webp',
        obtention: { pack: false, season: { id: 'season_0', grade: 'master' } },
    }),
    banner('grade_grandmaster_s0', 'Grand Master — Saison 0', {
        rarity: 'legendaire', season: 'season_0',
        asset: '/banners/s0-grand-master.webp',
        obtention: { pack: false, season: { id: 'season_0', grade: 'grandmaster' } },
    }),

    // ─── Bannières de pack ───────────────────────────────────────────────────
    // ⚠️ PROVISOIRE — les raretés sont posées à vue. Elles pilotent la chance
    //    de tirage (`POIDS_PAR_RARETE` dans lib/collection/packPool.ts) : les
    //    revoir change directement l'économie des packs.
    banner('dragon', 'Dragon', {
        rarity: 'legendaire', source: 'pack',
        obtention: { pack: true },
    }),
    banner('pc', 'Setup', {
        rarity: 'epique', source: 'pack',
        obtention: { pack: true },
    }),
    banner('lake', 'Lac', {
        rarity: 'rare', source: 'pack',
        obtention: { pack: true },
    }),
    banner('color_gradient', 'Dégradé', {
        rarity: 'commun', source: 'pack',
        asset: '/banners/color-gradient.webp',
        obtention: { pack: true },
    }),
    banner('color_lines', 'Lignes', {
        rarity: 'commun', source: 'pack',
        asset: '/banners/color-lines.webp',
        obtention: { pack: true },
    }),
    banner('distortion', 'Distorsion', {
        rarity: 'rare', source: 'pack',
        obtention: { pack: true },
    }),
    banner('wrapping', 'Emballage', {
        rarity: 'epique', source: 'pack',
        obtention: { pack: true },
    }),
    banner('singe', 'Singe', {
        rarity: 'epique', source: 'pack',
        obtention: { pack: true },
    }),
    banner('stars', 'Étoiles', {
        rarity: 'rare', source: 'pack',
        obtention: { pack: true },
    }),
    // Le nombre d'or. Le fichier s'appelle « 1.618 », l'item porte un nom
    // lisible : un joueur ne voit jamais un identifiant de fichier.
    banner('nombre_or', 'Nombre d\'or', {
        rarity: 'legendaire', source: 'pack',
        asset: '/banners/1.618.webp',
        obtention: { pack: true },
    }),

    // ─── Cercles ─────────────────────────────────────────────────────────────
    // DISPONIBLES POUR TOUT LE MONDE (Sacha, 22/08).
    //
    // `source: 'defaut'` ne demande AUCUN octroi : ces items sont possédés
    // sans figurer dans un inventaire. Les distribuer réellement aurait écrit
    // cinq documents pour chacun des 141 comptes, plus cinq de plus à chaque
    // inscription — pour un droit que personne ne peut perdre.
    //
    // Ils ne sortent pas des packs non plus : ce serait un tirage sans valeur.
    banner('cercle_cp', 'Cercle Polytechnique', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CP.webp',
    }),
    banner('cercle_cds', 'Cercle des Sciences', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CDS.webp',
    }),
    banner('cercle_cd', 'Cercle de Droit', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CD.webp',
    }),
    banner('cercle_cm', 'Cercle de Médecine', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CM.webp',
    }),
    banner('cercle_cs', 'Cercle Solvay', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CS.webp',
    }),
    // « CPS » = Cercle de Philosophie et Sciences Sociales (confirmé par
    // Sacha le 22/08 — j'avais lu « psychologie »).
    //
    // PREMIÈRE bannière à demander du texte NOIR : son tiers gauche mesure
    // 201/255, soit 141 une fois le voile appliqué — juste au-dessus du seuil
    // de bascule. Toutes les autres sont assez sombres pour du blanc.
    // Le voile s'inverse automatiquement (`getBannerScrimColor`) : il devient
    // clair sous un texte foncé.
    banner('cercle_cps', 'Cercle de Philosophie et Sciences Sociales', {
        rarity: 'commun', source: 'defaut', asset: '/banners/CPS.webp',
        textColor: '#1A2118',
    }),

    // ─── Titres de grade, saison 0 ───────────────────────────────────────────
    // Même règle d'attribution que les bannières de grade : la table
    // grade -> item vit dans `obtention.season`, `seasonGradeAwards` la lit.
    // Un titre ne coûte aucun asset — c'est le contenu le moins cher à produire
    // et il double la récompense de fin de saison sans rien dessiner.
    title('titre_argent_s0', 'Argent-S0', {
        rarity: 'commun', season: 'season_0',
        obtention: { pack: false, season: { id: 'season_0', grade: 'argent' } },
    }),
    title('titre_or_s0', 'Or-S0', {
        rarity: 'rare', season: 'season_0',
        obtention: { pack: false, season: { id: 'season_0', grade: 'or' } },
    }),
    title('titre_diamant_s0', 'Diamant-S0', {
        rarity: 'epique', season: 'season_0',
        obtention: { pack: false, season: { id: 'season_0', grade: 'diamant' } },
    }),
    title('titre_master_s0', 'Master-S0', {
        rarity: 'epique', season: 'season_0',
        obtention: { pack: false, season: { id: 'season_0', grade: 'master' } },
    }),
    title('titre_grandmaster_s0', 'Grand Master-S0', {
        rarity: 'legendaire', season: 'season_0',
        obtention: { pack: false, season: { id: 'season_0', grade: 'grandmaster' } },
    }),

    // ─── Titres de prestige ──────────────────────────────────────────────────
    // Tranché par Sacha le 22/08 : le champion pour le premier, le podium pour
    // les deux suivants. Une PLACE, pas un grade — on peut finir Grand Master
    // sans finir premier.
    title('champion_s0', 'Champion Saison 0', {
        rarity: 'legendaire', season: 'season_0',
        description: 'Attribué à la clôture de la saison 0 au joueur arrivé premier au classement général.',
        obtention: { pack: false, season: { id: 'season_0', rankRange: [1, 1] } },
    }),
    title('podium_s0', 'Podium Saison 0', {
        rarity: 'epique', season: 'season_0',
        description: 'Attribué à la clôture de la saison 0 aux joueurs arrivés deuxième et troisième au classement général.',
        obtention: { pack: false, season: { id: 'season_0', rankRange: [2, 3] } },
    }),
    title('titre_fondateur', 'Fondateur', {
        rarity: 'legendaire', source: 'createur',
        description: 'Réservé aux trois fondateurs de KickTracker.',
    }),

    // ─── Titres de pack ──────────────────────────────────────────────────────
    // Décision de Sacha (22/08) : ce sont des titres FUN, pas des exploits.
    // Ils n'ont pas de règle à calculer et ne renvoient à aucun badge.
    //
    // La règle générale du catalogue tient désormais en trois cas, et il n'y a
    // rien d'autre :
    //   1. récompense de SAISON, attribuée automatiquement à la clôture ;
    //   2. octroi MANUEL, décidé par Sacha (fondateurs, cas particuliers) ;
    //   3. tout le reste se gagne dans les PACKS.
    //
    // J'avais rattaché « Flasheur » et « Gamelleur » aux badges du profil qui
    // portent le même nom. C'était une erreur de lecture : le badge se mérite
    // par une statistique, le titre se tire dans un pack. Deux objets
    // distincts qui partagent un mot.
    title('titre_flasheur', 'Flasheur', {
        rarity: 'rare', source: 'pack', obtention: { pack: true },
    }),
    title('titre_gamelleur', 'Gamelleur', {
        rarity: 'rare', source: 'pack', obtention: { pack: true },
    }),
    title('titre_folklorique', 'Folklorique', {
        rarity: 'epique', source: 'pack', obtention: { pack: true },
    }),
    title('titre_bleu', 'Bleu.x.e', {
        rarity: 'commun', source: 'pack', obtention: { pack: true },
    }),
    title('titre_chose_enhaurme', 'Chose Enhaurme', {
        rarity: 'epique', source: 'pack', obtention: { pack: true },
    }),
    title('titre_boulet', 'Boulet', {
        rarity: 'commun', source: 'pack', obtention: { pack: true },
    }),
];
