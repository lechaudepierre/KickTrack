/**
 * GARDE-FOU — plus une seule directive Tailwind dans le CSS.
 *
 * Tailwind a été retiré du projet (chantier 5.4). Mais `GameTimer.module.css`
 * a gardé ses `@apply` pendant tout ce temps : sans le plugin PostCSS, ces
 * règles ne produisent RIEN. Le navigateur les ignore en silence, et le
 * composant s'affiche sans style sans qu'aucune erreur ne le signale.
 *
 * Ça a duré assez longtemps pour que le chronomètre de match soit invisible en
 * partie. Ce contrôle existe pour que ça ne recommence pas.
 */

import { globSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const fichiers = globSync('src/**/*.css');
const fautifs = [];

for (const f of fichiers) {
    // On retire les commentaires : une directive CITÉE dans un commentaire
    // d'explication n'est pas une directive.
    const sansCommentaires = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const lignes = sansCommentaires.split('\n');
    lignes.forEach((ligne, i) => {
        if (/(^|\s)@(apply|tailwind)\b/.test(ligne)) {
            fautifs.push(`${f}:${i + 1}  ${ligne.trim()}`);
        }
    });
}

if (fautifs.length > 0) {
    console.error('\nDirective Tailwind trouvée dans le CSS — elle ne produira RIEN :\n');
    fautifs.forEach(l => console.error('  ' + l));
    console.error('\nTailwind est retiré du projet. Écrire la règle en CSS, avec les tokens');
    console.error('de src/styles/variables.css.\n');
    process.exit(1);
}

console.log(`Tailwind : ${fichiers.length} feuille(s) vérifiée(s), aucune directive résiduelle.`);
