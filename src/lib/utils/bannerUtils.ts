/**
 * ─── SYSTÈME DE BANNIÈRES ─────────────────────────────────────────────────────
 *
 * ⚠️ CE MODULE EST EN COURS DE MIGRATION VERS LE CATALOGUE FIRESTORE (chantier 2.5).
 *
 * Avant : le map `BANNERS` + les attributions en dur par pseudo
 * (`CREATOR_USERNAMES`, `SPECIAL_BANNERS`) étaient la seule source.
 * Après : chaque bannière est un item du catalogue, chaque attribution un
 * `grantItem` normal, et le joueur équipe via `equipped.banner`.
 *
 * Ce qui reste ici est un FILET DE SÉCURITÉ : si le catalogue n'est pas encore
 * chargé, ou si un item n'y figure pas, l'affichage retombe sur ces valeurs.
 * À supprimer une fois la migration exécutée et vérifiée en production.
 *
 * Défaut connu de l'attribution par pseudo : renommer son compte fait perdre
 * sa bannière. C'est précisément ce que la migration corrige, en attribuant
 * par `userId`.
 *
 * ─── FORMAT UNIQUE DES BANNIÈRES (chantier 2.7) ──────────────────────────────
 *
 * Fichier 1800 × 400 px (ratio 4,5:1), WebP, < 150 Ko
 *
 * ⚠️ UN SEUL RATIO, PARTOUT — profil, classement, liste de joueurs, collection.
 * Le ratio est défini une fois pour toutes dans `styles/variables.css`
 * (`--banner-aspect-ratio`). Ne jamais le réécrire ailleurs.
 *
 * Auparavant le profil affichait en 4:1 et les listes en 5:1 : la même image
 * était rognée différemment selon l'écran, et il fallait réserver une « zone
 * sûre » au centre. **Ce n'est plus le cas.** Le fichier source et tous les
 * conteneurs partagent le même ratio, donc l'image s'affiche toujours en
 * entier. Plus de marge sacrifiable, plus de zone perdue.
 *
 * La seule contrainte de composition qui subsiste : dans les listes de joueurs,
 * le pseudo et le grade s'affichent PAR-DESSUS la bannière, avec un voile
 * sombre. Le tiers gauche doit rester visuellement calme.
 *
 * ⚠️ L'ancien champ `aspectRatio` a été supprimé : il était déclaré par
 * bannière mais LU NULLE PART, et annonçait un ratio qu'aucun asset ne
 * respectait. De la configuration morte qui donnait l'illusion d'un système.
 */

/**
 * Ratio unique des bannières, en valeur numérique.
 * La valeur qui fait foi pour l'affichage est le token CSS
 * `--banner-aspect-ratio`. Cette constante existe pour les calculs JS
 * (dimensions d'un canvas, validation d'un asset uploadé…).
 */
export const BANNER_ASPECT_RATIO = 9 / 2;

/** Dimensions attendues du fichier source. */
export const BANNER_SOURCE_WIDTH = 1800;
export const BANNER_SOURCE_HEIGHT = 400;

export type BannerId = string;

export interface BannerConfig {
    path: string;
    /**
     * Couleur du texte superposé, choisie pour contraster avec l'image.
     * '#ffffff' sur une bannière sombre, '#000000' sur une claire.
     */
    textColor: string;
}

/** Repli statique — la source de vérité est le catalogue Firestore. */
const FALLBACK_BANNERS: Record<string, BannerConfig> = {
    creator: { path: '/banners/hero-planet.webp', textColor: '#ffffff' },
    veloTDF: { path: '/banners/VéloTDF.png', textColor: '#ffffff' },
};

/**
 * Attributions historiques par pseudo.
 * ⚠️ Conservées uniquement pour la migration : le script `migrate-banners`
 * les lit pour créer les octrois correspondants, par `userId` cette fois.
 * Ne plus ajouter d'entrée ici — passer par le catalogue.
 */
export const CREATOR_USERNAMES = ['Astroboy', 'PIGEON ou BAGARRE', 'lechauvepierre'];

export const SPECIAL_BANNERS: Record<string, string> = {
    'Matricule13': 'veloTDF',
};

export function getBannerConfig(bannerId: string | undefined | null): BannerConfig | null {
    if (!bannerId) return null;
    return FALLBACK_BANNERS[bannerId] ?? null;
}

export function getBannerPath(bannerId: string | undefined | null): string | null {
    return getBannerConfig(bannerId)?.path ?? null;
}

/**
 * Bannière à afficher pour un joueur.
 * L'ordre de priorité importe : ce que le joueur a explicitement équipé passe
 * avant l'attribution historique par pseudo.
 */
export function resolveBannerId(
    username: string,
    profileBannerId?: string | null
): string | null {
    if (profileBannerId) return profileBannerId;
    if (CREATOR_USERNAMES.includes(username)) return 'creator';
    if (SPECIAL_BANNERS[username]) return SPECIAL_BANNERS[username];
    return null;
}

/** Voile appliqué sous le texte, pour qu'il reste lisible quelle que soit l'image. */
export function getBannerScrimColor(textColor: string): string {
    const isLightText = textColor.toLowerCase() === '#ffffff' || textColor.toLowerCase() === '#fff';
    return isLightText ? 'rgba(0, 0, 0, 0.30)' : 'rgba(255, 255, 255, 0.30)';
}
