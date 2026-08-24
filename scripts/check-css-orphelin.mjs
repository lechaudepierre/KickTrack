/**
 * GARDE-FOU — une feuille de style que personne n'importe.
 *
 * Un `.module.css` orphelin n'est pas seulement du poids mort : c'est un
 * PIÈGE. Il porte des noms de classes plausibles, il s'ouvre, il se modifie —
 * et rien ne change à l'écran, sans qu'aucune erreur ne le dise.
 *
 * `src/app/profile/page.module.css` était dans ce cas : 1 169 lignes, restées
 * après le découpage du profil en composants (24/08). Elle dupliquait des
 * dizaines de classes de `ProfileContent.module.css`.
 *
 * Contrairement au contrôle de contraste, celui-ci est FIABLE : un import se
 * résout, il ne se devine pas. Il a donc sa place dans `npm run check`.
 *
 * Lancé par `npm run check:css`.
 */

import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const modules = new Set(globSync('src/**/*.module.css').map(f => resolve(f)));
const importes = new Set();

for (const src of globSync('src/**/*.{ts,tsx}')) {
    const texte = readFileSync(src, 'utf8');
    for (const m of texte.matchAll(/from\s+['"]([^'"]+\.module\.css)['"]/g)) {
        const spec = m[1];
        importes.add(spec.startsWith('@/')
            ? resolve('src', spec.slice(2))
            : resolve(dirname(src), spec));
    }
}

const orphelins = [...modules].filter(m => !importes.has(m)).sort();
const fantomes = [...importes].filter(i => !modules.has(i)).sort();

if (orphelins.length > 0 || fantomes.length > 0) {
    if (orphelins.length > 0) {
        console.error('\nFeuille(s) de style que personne n\'importe — les modifier ne fera RIEN :\n');
        for (const o of orphelins) {
            const lignes = readFileSync(o, 'utf8').split('\n').length;
            console.error(`  ${String(lignes).padStart(5)} lignes   ${o.replace(process.cwd() + '/', '')}`);
        }
        console.error('\nLa supprimer, ou l\'importer là où elle doit servir.');
    }
    if (fantomes.length > 0) {
        console.error('\nImport(s) vers une feuille qui n\'existe pas :\n');
        for (const f of fantomes) console.error('  ' + f.replace(process.cwd() + '/', ''));
    }
    console.error('');
    process.exit(1);
}

console.log(`CSS : ${modules.size} feuille(s) de module, toutes importées.`);
