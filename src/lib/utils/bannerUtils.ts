// ─── Banner System ────────────────────────────────────────────────────────────
// Banners are images at a fixed 4:1 aspect ratio.
// They are always displayed at full size (no crop), just scaled.
// Add new banner IDs here and drop the corresponding image in /public/banners/.

export type BannerId = 'creator' | string;

interface BannerConfig {
    path: string;
    /** Native width / height of the image */
    aspectRatio: number;
    /**
     * CSS color to use for text overlaid on this banner.
     * Pick a color that contrasts well with the image.
     * e.g. '#ffffff' for dark banners, '#000000' for light ones.
     */
    textColor: string;
}

/** Map of bannerId → config */
const BANNERS: Record<string, BannerConfig> = {
    creator: { path: '/banners/CreatorV3.png', aspectRatio: 2578 / 1209, textColor: '#ffffff' },
    veloTDF: { path: '/banners/VéloTDF.png', aspectRatio: 5 / 1, textColor: '#ffffff' },
};

/** Usernames of the app creators — they automatically receive the creator banner */
export const CREATOR_USERNAMES = ['Astroboy', 'PIGEON ou BAGARRE', 'lechauvepierre'];

/** Special banner assignments: username → bannerId */
const SPECIAL_BANNERS: Record<string, string> = {
    'Matricule13': 'veloTDF',
};

/**
 * Returns the full banner config (path + aspectRatio) for a given bannerId, or null.
 */
export function getBannerConfig(bannerId: string | undefined | null): BannerConfig | null {
    if (!bannerId) return null;
    return BANNERS[bannerId] ?? null;
}

/**
 * Returns the image path for a given bannerId, or null if not found.
 */
export function getBannerPath(bannerId: string | undefined | null): string | null {
    return getBannerConfig(bannerId)?.path ?? null;
}

/**
 * Returns the bannerId to display for a given username.
 * Creators automatically get 'creator', others use their profile bannerId if set.
 */
export function resolveBannerId(
    username: string,
    profileBannerId?: string | null
): string | null {
    if (CREATOR_USERNAMES.includes(username)) return 'creator';
    if (SPECIAL_BANNERS[username]) return SPECIAL_BANNERS[username];
    return profileBannerId ?? null;
}

/**
 * Returns the CSS scrim color that should sit between the banner image and the text.
 * White text → dark scrim. Dark text → light scrim.
 */
export function getBannerScrimColor(textColor: string): string {
    // Treat anything that isn’t clearly a light color as white text → dark scrim
    const light = ['#000', '#000000', 'black', 'rgb(0,0,0)', 'rgb(0, 0, 0)'];
    const isLight = light.some(c => textColor.toLowerCase().startsWith(c.toLowerCase()));
    return isLight ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.30)';
}
