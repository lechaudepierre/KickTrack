/**
 * Garde-fou : aucune page ne doit poser le RACCOURCI `background:` sur une
 * classe portée par un PlayerBanner.
 *
 * Pourquoi ce script existe : le raccourci ne change pas seulement la couleur,
 * il remet à zéro toutes les autres propriétés de fond non citées — dont
 * `background-origin` et `background-image`. Posé sur une ligne à bannière, il
 * défait silencieusement le cadrage de l'image. Le défaut a coûté quatre
 * allers-retours avec Sacha avant d'être trouvé : il ne se voyait que sur SA
 * ligne du classement, la seule à porter `.currentUserItem`.
 *
 * Lancé par `npm run check:banner`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';

/**
 * `PlayerRow` enveloppe `PlayerBanner` depuis le 22/08. Sans lui dans cette
 * liste, le contrôle serait passé de 4 pages à 3 sans que personne ne le voie :
 * une indirection suffit à faire disparaître un garde-fou.
 */
const PORTEURS = ['<PlayerBanner', '<PlayerRow'];

const tsx = globSync('src/**/*.tsx').filter(f => {
    const src = readFileSync(f, 'utf8');
    return PORTEURS.some(p => src.includes(p));
});

const problems = [];

for (const file of tsx) {
    const src = readFileSync(file, 'utf8');
    const css = file.replace(/\.tsx$/, '.module.css');
    if (!existsSync(css)) continue;

    // Les classes citées dans le className d'un PlayerBanner.
    const classes = new Set();
    for (const porteur of PORTEURS) {
        const motif = new RegExp(`${porteur}[\\s\\S]*?>`, 'g');
        for (const tag of src.match(motif) ?? []) {
            for (const m of tag.matchAll(/styles\.(\w+)/g)) classes.add(m[1]);
        }
    }
    if (!classes.size) continue;

    const sheet = readFileSync(css, 'utf8');
    for (const cls of classes) {
        // Bloc de la règle `.cls { ... }`, commentaires exclus.
        const re = new RegExp(`^\\.${cls}\\b[^{]*\\{([^}]*)\\}`, 'm');
        const body = sheet.match(re)?.[1];
        if (body && /^\s*background\s*:/m.test(body)) {
            problems.push(`${css} : .${cls} utilise le raccourci « background: ». `
                + `Écris « background-color: » — le raccourci annule background-origin `
                + `et background-image de la bannière.`);
        }
    }
}

if (problems.length) {
    console.error('\nCSS de bannière — problèmes détectés :\n');
    for (const p of problems) console.error('  ' + p);
    console.error('');
    process.exit(1);
}
console.log(`CSS de bannière : ${tsx.length} page(s) vérifiée(s), rien à signaler.`);
