/**
 * POST /api/packs/open — ouvre un pack.
 *
 * Le tirage appartient au SERVEUR, sans exception. Un client qui pourrait
 * tirer lui-même relancerait jusqu'au légendaire, et l'ensemble du système de
 * collection ne vaudrait plus rien.
 *
 * Le joueur ne peut ouvrir que SES packs : l'identité vient du jeton, jamais
 * du corps de la requête.
 */

import { NextResponse } from 'next/server';
import { getAdminDb, requireCallerUid, HttpError } from '@/lib/firebase/admin';
import { openPack } from '@/lib/collection/packs';

export async function POST(request: Request) {
    try {
        const uid = await requireCallerUid(request);
        const { packId } = await request.json().catch(() => ({}));

        if (typeof packId !== 'string' || !packId) {
            return NextResponse.json({ error: 'packId manquant' }, { status: 400 });
        }

        const result = await openPack(getAdminDb(), uid, packId);
        return NextResponse.json(result);
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
        }
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        // « Pack introuvable » est une erreur du demandeur, pas du serveur :
        // c'est aussi la réponse quand on tente d'ouvrir le pack d'un autre,
        // puisqu'on ne cherche que dans les siens.
        if (message === 'Pack introuvable') {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        console.error('[POST /api/packs/open]', err);
        return NextResponse.json({ error: 'Erreur lors de l\'ouverture' }, { status: 500 });
    }
}
