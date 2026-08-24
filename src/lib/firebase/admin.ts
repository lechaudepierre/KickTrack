/**
 * SDK Firebase Admin — CÔTÉ SERVEUR UNIQUEMENT.
 *
 * [interdit] Ne jamais importer ce fichier depuis un composant client : il contient
 * les identifiants qui contournent TOUTES les règles Firestore.
 * Réservé aux Route Handlers (`src/app/api/**`) et aux scripts.
 *
 * Le projet est sur le plan Spark : pas de Cloud Functions. La couche serveur
 * est constituée de Route Handlers Next.js exécutés sur Vercel, qui jouent
 * exactement le même rôle (Doc/v2-refactor/CHANTIERS.md, chantier 0.3).
 *
 * Identifiants, par ordre de priorité :
 * 1. FIREBASE_SERVICE_ACCOUNT — le JSON complet dans une variable
 * d'environnement. C'est le mode utilisé sur Vercel.
 * 2. serviceAccountKey.json à la racine — mode développement local.
 * Ce fichier est dans .gitignore et ne doit JAMAIS être commité.
 */

import 'server-only';

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | null = null;

function loadCredentials() {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inline) {
        try {
            return JSON.parse(inline);
        } catch {
            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT est définie mais ne contient pas un JSON valide.'
            );
        }
    }

    // Repli local : lecture du fichier. `require` est volontaire — il évite
    // que le bundler tente de résoudre le chemin à la compilation.
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const keyPath = path.join(process.cwd(), 'serviceAccountKey.json');
        if (fs.existsSync(keyPath)) {
            return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        }
    } catch {
        // on tombe dans l'erreur explicite ci-dessous
    }

    throw new Error(
        'Identifiants Firebase Admin introuvables. ' +
        'Définir FIREBASE_SERVICE_ACCOUNT (Vercel) ou poser serviceAccountKey.json à la racine (local).'
    );
}

export function getAdminApp(): App {
    if (cachedApp) return cachedApp;

    const existing = getApps();
    if (existing.length > 0) {
        cachedApp = existing[0];
        return cachedApp;
    }

    cachedApp = initializeApp({ credential: cert(loadCredentials()) });
    return cachedApp;
}

export function getAdminDb(): Firestore {
    return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

/**
 * Vérifie le jeton d'identité porté par la requête et retourne l'UID appelant.
 *
 * Le client envoie `Authorization: Bearer <idToken>`. Sans jeton valide, aucune
 * route serveur ne doit rien faire : c'est la seule chose qui distingue un
 * joueur légitime d'un `curl` anonyme.
 */
export async function requireCallerUid(request: Request): Promise<string> {
    const header = request.headers.get('authorization') ?? '';
    const match = header.match(/^Bearer (.+)$/i);
    if (!match) {
        throw new HttpError(401, 'Jeton d\'authentification manquant');
    }

    try {
        const decoded = await getAdminAuth().verifyIdToken(match[1]);
        return decoded.uid;
    } catch {
        throw new HttpError(401, 'Jeton d\'authentification invalide ou expiré');
    }
}

/** Erreur portant un code HTTP, pour que les routes répondent proprement. */
export class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}
