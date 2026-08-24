/**
 * AUDIT — les fonds clairs qui ne reposent pas leur couleur de texte.
 *
 * CONSULTATIF, PAS BLOQUANT, et volontairement pas dans `npm run check`.
 * Je l'ai d'abord écrit comme garde-fou : il signale 105 règles. La plupart
 * vont bien — leurs enfants posent tous une couleur — mais on ne peut pas le
 * savoir depuis le CSS seul, il faudrait connaître l'arbre JSX. Un contrôle
 * qui crie 105 fois, personne ne le lance.
 *
 * Il reste utile comme LISTE DE TRAVAIL pour une passe de style : chaque
 * ligne est un endroit à regarder, pas une faute avérée.
 *
 * `body` est en BLANC, posé sur le fond terrain. Un conteneur crème qui ne
 * redéfinit pas `color` laisse donc ses enfants hériter du blanc : texte
 * invisible sur beige, sans qu'aucune erreur ne le signale.
 *
 * Ce défaut est apparu trois fois :
 *   - le chronomètre de match (22/08),
 *   - la fenêtre de fin de partie (son commentaire le raconte),
 *   - les colonnes J / +/- / Pts du classement de tournoi (24/08, vu par Sacha).
 *
 * La règle : toute règle CSS qui pose un fond clair pose aussi `color`.
 *
 * Pour une exception justifiée, mettre le commentaire `couleur-heritee` dans
 * la règle : c'est alors un choix explicite, pas un oubli.
 */

import { globSync, readFileSync } from 'node:fs';

/** Les fonds clairs sur lesquels du texte blanc disparaît. */
const FONDS_CLAIRS = [
    '--color-surface', '--color-surface-raised', '--color-surface-sunken',
    '--cream-', '--white', '--medal-gold', '--medal-silver', '--medal-bronze',
    '--color-accent',
];

const fichiers = globSync('src/**/*.module.css');
const fautifs = [];

for (const f of fichiers) {
    const css = readFileSync(f, 'utf8');

    // Quelles classes de ce fichier posent une couleur de texte ?
    const couleursParClasse = {};
    for (const r of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        const sel = r[1].trim().split('\n').pop().trim();
        if (!sel.startsWith('.')) continue;
        const n = sel.slice(1).split(/[\s:.>]/)[0];
        if (/^\s*color\s*:/m.test(r[2])) couleursParClasse[n] = true;
    }
    // Découpage grossier en règles : suffisant, le CSS du projet est plat.
    const regles = css.matchAll(/([^{}]*)\{([^{}]*)\}/g);

    for (const regle of regles) {
        const selecteur = regle[1].trim().split('\n').pop().trim();
        const corps = regle[2];
        if (!selecteur.startsWith('.')) continue;

        // Une variante d'état (`:hover`, `:focus`…) ne repeint qu'un fond :
        // la couleur du texte vient de la règle de base.
        if (/[:.\s>]/.test(selecteur.slice(1)) && /:(hover|focus|active|disabled|checked|not\()/.test(selecteur)) continue;

        // Une classe dont le NOM dérive d'une autre (`.carteActive` pour
        // `.carte`) est un modificateur : la base porte la couleur.
        const nom = selecteur.slice(1).split(/[\s:.>]/)[0];
        const base = Object.keys(couleursParClasse).find(
            c => c !== nom && nom.startsWith(c) && couleursParClasse[c]);
        if (base) continue;

        const fond = corps.match(/^\s*(background|background-color)\s*:\s*([^;]+);/m);
        if (!fond) continue;

        const valeur = fond[2];
        const estClair = FONDS_CLAIRS.some(t => valeur.includes(t)) || /\bwhite\b/.test(valeur);
        if (!estClair) continue;

        // `color` posé dans la même règle, ou exception assumée.
        if (/^\s*color\s*:/m.test(corps)) continue;
        if (corps.includes('couleur-heritee')) continue;

        const ligne = css.slice(0, regle.index).split('\n').length;
        fautifs.push(`${f}:${ligne}  ${selecteur}  fond ${valeur.trim()}`);
    }
}

console.log(`\nContraste — ${fichiers.length} feuilles examinées, ${fautifs.length} règle(s) à regarder.`);
console.log('Un fond clair sans `color` laisse ses enfants hériter du BLANC de `body`.');
console.log('Ce n\'est une FAUTE que si un enfant ne pose pas sa propre couleur.\n');

const parFichier = {};
for (const l of fautifs) {
    const f = l.slice(0, l.indexOf(':'));
    (parFichier[f] ??= []).push(l.slice(l.indexOf(':') + 1));
}
for (const [f, lignes] of Object.entries(parFichier).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${f}  (${lignes.length})`);
    for (const l of lignes) console.log(`      ${l}`);
}
