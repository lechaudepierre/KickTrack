/**
 * GET /api/version — quelle version est déployée EN CE MOMENT.
 *
 * Le client compare cette réponse à la version figée dans son propre bundle.
 * Si elles diffèrent, il fait tourner du code périmé (voir
 * `lib/version/updateCheck.ts`).
 *
 * `no-store` n'est pas décoratif : sans lui, la réponse serait mise en cache
 * par le navigateur ou par le CDN, et un client périmé recevrait éternellement
 * l'ancienne version — exactement le problème qu'on cherche à détecter.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(
        { version: process.env.VERSION_DEPLOIEMENT ?? 'dev' },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
}
