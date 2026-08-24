/**
 * CONTRÔLE — un compte Firebase Auth sans profil Firestore.
 *
 * Un compte peut exister côté Auth sans que son document `users` ait été créé :
 * l'inscription s'est interrompue entre les deux écritures. Le joueur se
 * connecte alors avec succès, mais l'application ne le reconnaît pas.
 *
 * Jusqu'au 23/08 la page de connexion ne faisait alors RIEN — ni redirection,
 * ni message. Deux personnes étaient bloquées dans cette boucle. La connexion
 * envoie désormais vers `/welcome`, qui termine l'inscription.
 *
 * Ce script existe pour voir combien de comptes sont dans cet état, et si le
 * nombre grandit. Il ne modifie rien.
 *
 * Usage :
 *   npm run audit:comptes
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { existsSync, readFileSync } from 'node:fs';

const CLE = './serviceAccountKey.json';
if (!existsSync(CLE)) {
    console.error('serviceAccountKey.json introuvable a la racine du projet.');
    process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(CLE, 'utf8'))) });

async function main() {
    const profils = await getFirestore().collection('users').get();
    const idsProfils = new Set(profils.docs.map(d => d.id));

    // listUsers pagine par 1000 : on déroule tout.
    const comptes = [];
    let page = await getAuth().listUsers(1000);
    comptes.push(...page.users);
    while (page.pageToken) {
        page = await getAuth().listUsers(1000, page.pageToken);
        comptes.push(...page.users);
    }

    const sansProfil = comptes.filter(u => !idsProfils.has(u.uid));
    const sansCompte = profils.docs.filter(d => !comptes.some(u => u.uid === d.id));

    // Un compte sans fournisseur ne peut plus se reconnecter : il n'a ni mot de
    // passe ni Google. Il ne bloque donc personne, contrairement aux autres.
    const recuperables = sansProfil.filter(u => u.providerData.length > 0);
    const inertes = sansProfil.filter(u => u.providerData.length === 0);

    console.log('');
    console.log(`Comptes Auth              : ${comptes.length}`);
    console.log(`Profils Firestore         : ${profils.size}`);
    console.log(`Auth sans profil          : ${sansProfil.length}`);
    console.log(`  dont joueurs bloques    : ${recuperables.length}  <- ils peuvent se connecter`);
    console.log(`  dont comptes inertes    : ${inertes.length}  (aucun fournisseur, personne ne peut s'y connecter)`);
    console.log(`Profil sans compte Auth   : ${sansCompte.length}`);
    console.log('');

    if (recuperables.length > 0) {
        console.log('Joueurs bloques — ils atterrissent sur /welcome et peuvent terminer :');
        for (const u of recuperables) {
            console.log(`  ${u.uid}  ${(u.email ?? '(sans email)').padEnd(30)} ${u.providerData.map(p => p.providerId).join(',')}`);
        }
        console.log('');
    }

    if (inertes.length > 0) {
        console.log('Comptes inertes — a supprimer un jour, sans urgence :');
        for (const u of inertes) {
            console.log(`  ${u.uid}  cree ${u.metadata.creationTime}`);
        }
        console.log('');
    }

    if (sansCompte.length > 0) {
        console.log('ATTENTION : des profils n\'ont plus de compte Auth. Leurs parties et');
        console.log('leur ELO existent, mais personne ne peut s\'y connecter.');
        for (const d of sansCompte) console.log(`  ${d.id}  ${d.data().username}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
