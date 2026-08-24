/**
 * Crée les index composites Firestore décrits par `firestore.indexes.json`.
 *
 * Comme pour les règles, on passe par l'API REST avec la clé de service : la
 * CLI Firebase exige une session interactive.
 *
 * Un index déjà présent renvoie 409 — traité comme un succès, le script est
 * donc rejouable sans précaution.
 *
 * ATTENTION : la construction d'un index prend plusieurs minutes. Les requêtes
 * qui en dépendent échouent avec `failed-precondition` d'ici là — c'est
 * pourquoi le code appelant garde toujours un repli.
 */
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const APPLY = process.argv.includes('--apply');
const cle = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
const config = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));

const auth = new GoogleAuth({ credentials: cle, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const client = await auth.getClient();
const base = `https://firestore.googleapis.com/v1/projects/${cle.project_id}/databases/(default)/collectionGroups`;

console.log(`\n  Projet : ${cle.project_id}`);
console.log(`  Index décrits : ${config.indexes.length}`);
console.log(`  Mode : ${APPLY ? '[CREATION REELLE]' : '[SIMULATION]'}\n`);

for (const index of config.indexes) {
    const champs = index.fields.map(f => `${f.fieldPath} ${f.arrayConfig ?? f.order}`).join(', ');
    console.log(`  ${index.collectionGroup} : ${champs}`);

    if (!APPLY) continue;

    try {
        await client.request({
            url: `${base}/${index.collectionGroup}/indexes`,
            method: 'POST',
            data: { queryScope: index.queryScope ?? 'COLLECTION', fields: index.fields },
        });
        console.log('    -> création lancée (quelques minutes)');
    } catch (err) {
        const code = err?.response?.status;
        if (code === 409) console.log('    -> existe déjà');
        else {
            console.log('    -> ECHEC : ' + (err?.response?.data?.error?.message ?? err.message));
        }
    }
}

if (!APPLY) console.log('\n  Rien créé. Relancer avec --apply.\n');
else console.log('\n  Suivre l\'avancement : console Firebase -> Firestore -> Index.\n');
