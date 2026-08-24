/**
 * CONTRÔLE — le score enregistré sur chaque partie correspond-il à ses buts ?
 *
 * Depuis le chantier 9.4, le score et le multiplicateur d'une partie sont
 * REJOUÉS depuis la liste des buts (`lib/game/goalEngine.ts`) : ils ne peuvent
 * plus diverger. Mais les parties d'avant ont été écrites par soustraction, et
 * certaines portent un score que leurs buts ne produisent pas.
 *
 * Un score NÉGATIF n'en fait pas partie : une gamelle encaissée à 0 met bien
 * à -1, c'est la règle du jeu. Le compteur ci-dessous est là pour information,
 * pas comme une alerte.
 *
 * Ce script les repère. Il ne CORRIGE rien : une partie terminée a déjà donné
 * son ELO, et réécrire son score après coup n'annulerait pas ce qui a été
 * distribué. On veut savoir, pas réécrire l'histoire.
 *
 * Usage :
 *   npm run audit:scores
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';
import { rejouerButs } from '../src/lib/game/goalEngine';

const CLE = './serviceAccountKey.json';
if (!existsSync(CLE)) {
    console.error('serviceAccountKey.json introuvable a la racine du projet.');
    process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(CLE, 'utf8'))) });

interface Ecart {
    id: string;
    status: string;
    buts: number;
    stocke: [number, number];
    rejoue: [number, number];
    vainqueurAvant: 0 | 1 | null;
    vainqueurApres: 0 | 1 | null;
}

const vainqueur = (s: [number, number]): 0 | 1 | null =>
    s[0] === s[1] ? null : s[0] > s[1] ? 0 : 1;

async function main() {
    const snap = await getFirestore().collection('games').get();

    let negatives = 0;
    let forfaits = 0;
    const ecarts: Ecart[] = [];

    for (const doc of snap.docs) {
        const g = doc.data();
        const teams = g.teams ?? [];

        // Une partie sans aucun but est un forfait : `forfeitGame` y écrit un
        // score symbolique qui ne vient d'aucun but. La liste de buts n'y fait
        // pas foi, la comparer n'aurait aucun sens.
        if ((g.goals ?? []).length === 0) {
            forfaits++;
            continue;
        }
        const stocke: [number, number] = [teams[0]?.score ?? 0, teams[1]?.score ?? 0];
        const rejoue = rejouerButs(g.goals ?? []).scores;

        if (stocke[0] < 0 || stocke[1] < 0) negatives++;
        if (rejoue[0] === stocke[0] && rejoue[1] === stocke[1]) continue;

        ecarts.push({
            id: doc.id,
            status: g.status ?? '?',
            buts: (g.goals ?? []).length,
            stocke,
            rejoue,
            vainqueurAvant: vainqueur(stocke),
            vainqueurApres: vainqueur(rejoue),
        });
    }

    const vainqueurChange = ecarts.filter(e => e.vainqueurAvant !== e.vainqueurApres);
    const enCours = ecarts.filter(e => e.status === 'in_progress');

    console.log('');
    console.log(`Parties examinees          : ${snap.size}`);
    console.log(`Forfaits (aucun but)       : ${forfaits}  -- exclus, score symbolique`);
    console.log(`Scores negatifs            : ${negatives}  -- normal, une gamelle fait descendre`);
    console.log(`Ecart avec le rejeu        : ${ecarts.length}`);
    console.log(`  dont encore en cours     : ${enCours.length}`);
    console.log(`  dont vainqueur different : ${vainqueurChange.length}`);
    console.log('');

    for (const e of ecarts) {
        const alerte = e.vainqueurAvant !== e.vainqueurApres ? '   <-- VAINQUEUR DIFFERENT' : '';
        console.log(
            `  ${e.id}  ${e.status.padEnd(12)} ${String(e.buts).padStart(3)} buts` +
            `   stocke ${e.stocke.join('-').padEnd(7)} rejoue ${e.rejoue.join('-').padEnd(7)}${alerte}`
        );
    }

    console.log('');
    if (vainqueurChange.length > 0) {
        console.log('ATTENTION : des parties terminees changeraient de vainqueur si on les');
        console.log('rejouait. Leur ELO a deja ete distribue sur l ancien resultat. Ne pas');
        console.log('corriger sans decider quoi faire de cet ELO.');
    } else if (ecarts.length > 0) {
        console.log('Aucun vainqueur ne change : ces ecarts sont cosmetiques.');
    } else {
        console.log('Aucun ecart. Toutes les parties sont coherentes avec leurs buts.');
    }

    // Les parties en cours, elles, se recaleront toutes seules : le prochain
    // but ou la prochaine annulation les rejouera depuis leurs buts.
    if (enCours.length > 0) {
        console.log('');
        console.log(`${enCours.length} partie(s) en cours se recaleront d elles-memes au prochain but.`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
