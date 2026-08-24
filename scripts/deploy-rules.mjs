/**
 * Déploie `firestore.rules` en production via l'API REST Firebase Rules.
 *
 * Pourquoi pas `firebase deploy` : la CLI exige une session interactive
 * (`firebase login`) et, quand on la contourne avec la clé de service, il lui
 * manque la permission Service Usage. L'API REST, elle, accepte directement le
 * compte de service — c'est ce qu'on utilise depuis le 20/08.
 *
 * Deux étapes, comme la CLI :
 *   1. créer un « ruleset » (le contenu compilé) ;
 *   2. faire pointer la « release » `cloud.firestore` dessus.
 *
 * Simulation par défaut. `--apply` pour écrire réellement.
 */
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const APPLY = process.argv.includes('--apply');
const cle = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
const PROJET = cle.project_id;
const source = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const auth = new GoogleAuth({
    credentials: cle,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const base = `https://firebaserules.googleapis.com/v1/projects/${PROJET}`;

console.log(`\n  Projet : ${PROJET}`);
console.log(`  Règles : ${source.split('\n').length} lignes`);
console.log(`  Mode   : ${APPLY ? '[ECRITURE REELLE EN PRODUCTION]' : '[SIMULATION - aucune écriture]'}\n`);

// La création du ruleset COMPILE les règles : une erreur de syntaxe est
// rejetée ici, avant toute mise en service. C'est notre vérification.
const creation = await client.request({
    url: `${base}/rulesets`,
    method: 'POST',
    data: { source: { files: [{ name: 'firestore.rules', content: source }] } },
});

const rulesetName = creation.data.name;
console.log(`  Compilation : OK -> ${rulesetName}`);

if (!APPLY) {
    console.log('\n  Rien n\'a été mis en service. Relancer avec --apply.\n');
    process.exit(0);
}

// `releases.patch` attend un UpdateReleaseRequest, donc la release EMBALLÉE
// dans un champ `release` — pas ses champs à plat. Envoyer `{ name, rulesetName }`
// directement fait répondre « Unknown name "rulesetName" », ce qui est
// trompeur : le champ existe, il est juste à un autre niveau.
await client.request({
    url: `${base}/releases/cloud.firestore`,
    method: 'PATCH',
    data: {
        release: { name: `projects/${PROJET}/releases/cloud.firestore`, rulesetName },
        updateMask: 'rulesetName',
    },
});

console.log('  [ok] Règles en service.\n');
