/**
 * Initialisation partagée du SDK admin pour les scripts.
 *
 * ⚠️ CES SCRIPTS ÉCRIVENT DANS LA BASE DE PRODUCTION.
 * Il n'y a pas d'émulateur configuré sur ce projet : `serviceAccountKey.json`
 * pointe sur le vrai Firestore, avec ses 147 comptes réels.
 * Tout script mutant DOIT donc être en simulation par défaut et n'écrire
 * que sur passage explicite de `--apply`.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';

const KEY_PATH = new URL('../serviceAccountKey.json', import.meta.url);

if (!existsSync(KEY_PATH)) {
    console.error('[echec] serviceAccountKey.json introuvable à la racine du projet.');
    console.error(' Firebase Console → Paramètres → Comptes de service → Générer une clé privée.');
    process.exit(1);
}

if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(KEY_PATH))) });
}

export const db = getFirestore();

/** `--apply` écrit réellement. Sans lui, le script se contente d'afficher. */
export const APPLY = process.argv.includes('--apply');

export function announceMode(scriptName) {
    console.log(`\n${'═'.repeat(66)}`);
    console.log(` ${scriptName}`);
    console.log(` Mode : ${APPLY ? '[ECRITURE REELLE EN PRODUCTION]' : '[SIMULATION — aucune écriture]'}`);
    if (!APPLY) console.log(` Ajouter --apply pour exécuter réellement.`);
    console.log(`${'═'.repeat(66)}\n`);
}
