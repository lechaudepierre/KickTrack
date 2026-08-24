/**
 * GARDE-FOU — pas d'unité de fenêtre sur la page de match.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE PAGE EST DIFFÉRENTE
 * ═══════════════════════════════════════════════════════════════════════════
 * En rotation forcée, la page de match applique `transform: rotate(90deg)` sur
 * un conteneur parent. En CSS, **tout ancêtre porteur d'un `transform` devient
 * le bloc conteneur de ses descendants en `position: fixed`** : ils cessent
 * d'être calés sur la fenêtre.
 *
 * Et ce conteneur a ses dimensions INVERSÉES (`width: 86vh; height: 100vw`).
 * Donc `100vw` y désigne la hauteur de l'écran, et `100vh` sa largeur.
 *
 * Ça s'est déjà produit trois fois : l'éclair du but flash apparaissait en bas
 * à gauche, coupé ; l'affichage d'ELO et le gage étaient décalés ; la vue
 * spectateur se dimensionnait de travers. À chaque fois, aucune erreur — juste
 * un élément au mauvais endroit, qu'il faut voir pour comprendre.
 *
 * La règle : sur ces fichiers, une superposition se dimensionne avec `inset`
 * et des pourcentages, jamais avec `vw`/`vh`.
 *
 * `dvh` reste autorisé : il n'est utilisé que hors du conteneur pivoté, et
 * c'est la seule unité correcte pour la barre d'adresse mobile.
 *
 * Lancé par `npm run check:match`.
 */

import { globSync, readFileSync } from 'node:fs';

/** Les feuilles rendues sous le conteneur pivoté de la page de match. */
const FEUILLES = [
    'src/app/game/[id]/game-page.module.css',
    ...globSync('src/components/game/*.module.css'),
];

const fautifs = [];

for (const f of FEUILLES) {
    let css;
    try { css = readFileSync(f, 'utf8'); } catch { continue; }

    // Les commentaires expliquent justement la règle : ils ne l'enfreignent pas.
    const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

    sansCommentaires.split('\n').forEach((ligne, i) => {
        // `dvh` et `svh` sont permis ; on ne vise que `vw` et `vh` bruts.
        if (/\b\d+(?:\.\d+)?v[wh]\b/.test(ligne)) {
            fautifs.push(`${f}:${i + 1}  ${css.split('\n')[i].trim()}`);
        }
    });
}

if (fautifs.length > 0) {
    console.error('\nUnité de fenêtre sur la page de match — elle désignera la MAUVAISE dimension :\n');
    fautifs.forEach(l => console.error('  ' + l));
    console.error('\nCette page pivote son conteneur : `100vw` y vaut la hauteur de l\'écran.');
    console.error('Utiliser `inset` et des pourcentages. `dvh` reste permis hors rotation.\n');
    process.exit(1);
}

console.log(`Page de match : ${FEUILLES.length} feuille(s), aucune unité de fenêtre.`);
