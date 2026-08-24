/**
 * POST /api/auth/methods — comment cette adresse se connecte-t-elle ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE ROUTE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 * Quand un compte passe à Google, Firebase supprime son mot de passe si
 * l'adresse n'était pas vérifiée. Le joueur qui retente son mot de passe reçoit
 * alors « identifiants incorrects » — un message qui l'envoie chercher au
 * mauvais endroit. Sacha y a passé une heure le 21/08.
 *
 * Côté navigateur, on ne peut pas le savoir : la protection contre
 * l'énumération d'adresses fait que `fetchSignInMethodsForEmail` ne renvoie
 * plus rien. Seul le serveur peut répondre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LA ROUTE NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 * Elle ne dit JAMAIS si une adresse existe. Une adresse inconnue et une adresse
 * connue en mot de passe renvoient la même réponse : `{ useGoogle: false }`.
 * Le seul cas distingué est « ce compte se connecte avec Google » — une
 * information que Google révèle de toute façon dès qu'on tente la connexion.
 *
 * Sans cette précaution, la route serait un outil pour tester si une adresse
 * est inscrite chez vous.
 */

import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/admin';

export async function POST(request: Request) {
    try {
        const { email } = (await request.json()) as { email?: string };
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ useGoogle: false });
        }

        const user = await getAdminAuth().getUserByEmail(email.trim().toLowerCase());
        const providers = user.providerData.map(p => p.providerId);

        return NextResponse.json({
            // Uniquement vrai quand Google est la SEULE méthode : c'est le cas
            // où le mot de passe ne peut pas fonctionner.
            useGoogle: providers.includes('google.com') && !providers.includes('password'),
        });
    } catch {
        // Adresse inconnue, ou toute autre erreur : réponse neutre.
        return NextResponse.json({ useGoogle: false });
    }
}
