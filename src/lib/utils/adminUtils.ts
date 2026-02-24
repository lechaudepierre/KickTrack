/**
 * Emails des administrateurs autorisés à publier des annonces.
 * Basé sur l'email (ne change pas, contrairement au username).
 */
export const ADMIN_EMAILS = [
    'sachatheben03@gmail.com',
    'r.brantegem@gmail.com',
    'lechaudepierre@gmail.com',
];

export function isAdmin(email: string | undefined | null): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
