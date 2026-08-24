/**
 * Donne un pack à un joueur — outil d'administration.
 *
 * Sert à TESTER la boucle complète sans jouer dix parties : octroi, pastille
 * de notification, ouverture, tirage serveur, animation.
 *
 * Usage :
 *   node scripts/grant-pack.mjs Astroboy            (simulation)
 *   node scripts/grant-pack.mjs Astroboy --apply
 *   node scripts/grant-pack.mjs Astroboy --apply --nombre 3
 *
 * Passe par le même chemin que la fin de partie : le pack porte un identifiant
 * déterministe et le compteur de non-ouverts suit. Rien de spécial, donc rien
 * qui puisse diverger du vrai comportement.
 */
import { db, APPLY, announceMode } from './_admin.mjs';
import { Timestamp } from 'firebase-admin/firestore';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const pseudo = args[0];
const idxNombre = process.argv.indexOf('--nombre');
const nombre = idxNombre > -1 ? Number(process.argv[idxNombre + 1]) || 1 : 1;

if (!pseudo) {
    console.error('Usage : node scripts/grant-pack.mjs <pseudo> [--apply] [--nombre N]');
    process.exit(1);
}

announceMode('Octroi de pack');

const snap = await db.collection('users')
    .where('usernameLowercase', '==', pseudo.toLowerCase().trim())
    .get();

if (snap.empty) {
    console.error(`  Joueur introuvable : « ${pseudo} »`);
    process.exit(1);
}

const userDoc = snap.docs[0];
const data = userDoc.data();
const granted = data.packsGranted ?? 0;
const unopened = data.packsUnopened ?? 0;

const ids = [];
for (let i = 1; i <= nombre; i++) ids.push(`pack_${granted + i}`);

console.log(`  Joueur : ${data.username} (${userDoc.id})`);
console.log(`  Packs déjà octroyés : ${granted} | non ouverts : ${unopened}`);
console.log(`  À créer : ${ids.join(', ')}\n`);

if (!APPLY) {
    console.log('  Rien n\'a été écrit. Relancer avec --apply.\n');
    process.exit(0);
}

const batch = db.batch();
for (let i = 0; i < ids.length; i++) {
    batch.set(userDoc.ref.collection('packs').doc(ids[i]), {
        index: granted + i + 1,
        earnedAt: Timestamp.now(),
        sourceRef: 'admin',
    });
}
batch.update(userDoc.ref, {
    packsGranted: granted + nombre,
    packsUnopened: unopened + nombre,
    // Le repère est posé s'il ne l'était pas : sinon la prochaine fin de
    // partie le poserait et recalculerait un dû incohérent avec ce cadeau.
    packsBaseline: data.packsBaseline ?? (data.stats?.totalGames ?? 0),
});
await batch.commit();

console.log(`  [ok] ${nombre} pack(s) octroyé(s) à ${data.username}.\n`);
