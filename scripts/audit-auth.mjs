/**
 * Audit des comptes d'authentification.
 * Répond à : qui pourra se connecter avec Google, qui devra être relié, qui ne pourra pas.
 *
 * Usage : node scripts/audit-auth.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync(new URL('../serviceAccountKey.json', import.meta.url)));
initializeApp({ credential: cert(key) });

const auth = getAuth();
const db = getFirestore();

const users = [];
let page = await auth.listUsers(1000);
users.push(...page.users);
while (page.pageToken) { page = await auth.listUsers(1000, page.pageToken); users.push(...page.users); }

const providersOf = (u) => u.providerData.map(p => p.providerId);
const bucket = { google: [], passwordGoogleMail: [], passwordOtherMail: [], anonymous: [], autre: [] };

for (const u of users) {
  const p = providersOf(u);
  if (p.includes('google.com')) bucket.google.push(u);
  else if (p.includes('password')) {
    const mail = (u.email || '').toLowerCase();
    (mail.endsWith('@gmail.com') || mail.endsWith('@googlemail.com')
      ? bucket.passwordGoogleMail : bucket.passwordOtherMail).push(u);
  }
  else if (p.length === 0) bucket.anonymous.push(u);
  else bucket.autre.push(u);
}

console.log(`\n═══ ${users.length} comptes d'authentification ═══\n`);
console.log(`  Google déjà relié .................. ${bucket.google.length}`);
console.log(`  Mot de passe, adresse Google ....... ${bucket.passwordGoogleMail.length}   → connexion Google possible, à relier`);
console.log(`  Mot de passe, autre adresse ........ ${bucket.passwordOtherMail.length}   → ne pourront PAS utiliser Google`);
console.log(`  Anonymes ........................... ${bucket.anonymous.length}   → aucun email, irrécupérables`);
console.log(`  Autre .............................. ${bucket.autre.length}`);

if (bucket.passwordOtherMail.length) {
  const domains = {};
  for (const u of bucket.passwordOtherMail) {
    const d = (u.email || '?').split('@')[1] || '?';
    domains[d] = (domains[d] || 0) + 1;
  }
  console.log('\n  Domaines non-Google :', Object.entries(domains).sort((a,b)=>b[1]-a[1]).map(([d,n])=>`${d} (${n})`).join(', '));
}

// Doublons d'email = risque de comptes dupliqués
const byMail = {};
for (const u of users) if (u.email) (byMail[u.email.toLowerCase()] ||= []).push(u);
const dups = Object.entries(byMail).filter(([, v]) => v.length > 1);
console.log(`\n  Emails partagés par plusieurs comptes : ${dups.length}`);

// Comptes anonymes : ont-ils des données de jeu ?
if (bucket.anonymous.length) {
  console.log('\n  ─── Comptes anonymes en détail ───');
  for (const u of bucket.anonymous) {
    const snap = await db.collection('users').doc(u.uid).get();
    const d = snap.data();
    console.log(`    ${u.uid}  pseudo=${d?.username ?? '(pas de doc)'}  parties=${d?.stats?.totalGames ?? 0}  elo=${d?.stats?.elo ?? '-'}`);
  }
}

// Comptes Auth sans document Firestore, et l'inverse
const authUids = new Set(users.map(u => u.uid));
const docs = await db.collection('users').get();
const orphanDocs = docs.docs.filter(d => !authUids.has(d.id));
const orphanAuth = users.filter(u => !docs.docs.some(d => d.id === u.uid));
console.log(`\n  Documents Firestore sans compte Auth : ${orphanDocs.length}`);
console.log(`  Comptes Auth sans document Firestore : ${orphanAuth.length}`);
console.log(`  Documents 'users' au total ........... ${docs.size}\n`);
