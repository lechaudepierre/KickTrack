/**
 * Garde-fou : aucun composant CLIENT ne doit atteindre un module `server-only`,
 * même indirectement.
 *
 * Pourquoi ce script existe : le 21/08, `readQuantity` a été ajouté dans
 * `lib/collection/grant.ts`, qui importe `server-only` parce qu'il touche
 * `firebase-admin`. La page Collection — un composant client — l'a importé
 * pour afficher « x3 », et toute la compilation est tombée.
 *
 * L'erreur de Next arrive au build ou à la compilation à chaud, jamais dans
 * `tsc` ni dans les tests. D'où ce contrôle, qui se lance en une seconde.
 *
 * Règle générale : ce qui est de la LOGIQUE va hors des modules `server-only`,
 * seul l'ACCÈS y reste.
 *
 * Lancé par `npm run check:server`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const RACINE = process.cwd();
const SOURCES = globSync('src/**/*.{ts,tsx}').filter(f => !f.endsWith('.test.ts'));

const lire = (f) => readFileSync(f, 'utf8');

/** Résout un import vers un fichier du dépôt, ou null si c'est un paquet. */
function resoudre(depuis, spec) {
    let base;
    if (spec.startsWith('@/')) base = resolve(RACINE, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(depuis), spec);
    else return null;

    for (const suffixe of ['.ts', '.tsx', '/index.ts', '/index.tsx', '']) {
        const candidat = base + suffixe;
        if (existsSync(candidat) && !candidat.endsWith('/')) return relative(RACINE, candidat);
    }
    return null;
}

const importsDe = new Map();
const estServerOnly = new Set();
const estClient = new Set();

for (const f of SOURCES) {
    const src = lire(f);
    if (/^\s*import\s+['"]server-only['"]/m.test(src)) estServerOnly.add(f);
    if (/^\s*['"]use client['"]/m.test(src)) estClient.add(f);

    const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
    importsDe.set(f, specs.map(s => resoudre(f, s)).filter(Boolean));
}

/** Chemin d'import d'un fichier client vers un module server-only, s'il existe. */
function chercherChemin(depart) {
    const vus = new Set([depart]);
    const file = [[depart, [depart]]];
    while (file.length) {
        const [courant, chemin] = file.shift();
        for (const suivant of importsDe.get(courant) ?? []) {
            if (vus.has(suivant)) continue;
            vus.add(suivant);
            const nouveau = [...chemin, suivant];
            if (estServerOnly.has(suivant)) return nouveau;
            file.push([suivant, nouveau]);
        }
    }
    return null;
}

const problemes = [];
for (const f of estClient) {
    const chemin = chercherChemin(f);
    if (chemin) problemes.push(chemin);
}

if (problemes.length) {
    console.error('\nUn composant client atteint un module « server-only » :\n');
    for (const chemin of problemes) console.error('  ' + chemin.join('\n    -> '));
    console.error('\nDéplacer la logique concernée hors du module server-only.\n');
    process.exit(1);
}
console.log(`server-only : ${estClient.size} composant(s) client vérifié(s), `
    + `${estServerOnly.size} module(s) serveur, aucune fuite.`);
