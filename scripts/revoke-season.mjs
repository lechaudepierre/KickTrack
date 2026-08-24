/**
 * MARCHE ARRIÈRE d'une clôture de saison.
 *
 * Tout ce que la clôture octroie porte le même `sourceRef`. On retrouve donc
 * exactement ce qui a été distribué, et rien d'autre.
 *
 * ⚠️ CE QUI N'EST PAS ANNULÉ : la compression de l'ELO. Elle écrase l'ancienne
 * valeur, et rien ne permet de la retrouver — sauf l'instantané du classement,
 * qui la conserve dans `seasons/{id}/standings`. Une restauration manuelle
 * reste donc possible, mais elle n'est pas automatique.
 *
 * Usage : node scripts/revoke-season.mjs season_0_close [--apply]
 */
import { db, APPLY, announceMode } from './_admin.mjs';

const sourceRef = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!sourceRef) {
    console.error('Usage : node scripts/revoke-season.mjs <sourceRef> [--apply]');
    process.exit(1);
}

announceMode(`Annulation de la distribution « ${sourceRef} »`);

const users = await db.collection('users').get();
const aAnnuler = [];

for (const u of users.docs) {
    const grants = await u.ref.collection('grants').where('sourceRef', '==', sourceRef).get();
    for (const g of grants.docs) {
        aAnnuler.push({ userId: u.id, username: u.data().username, grantId: g.id, itemId: g.data().itemId });
    }
}

console.log(`  ${aAnnuler.length} octroi(s) trouvé(s) pour « ${sourceRef} »\n`);
for (const a of aAnnuler.slice(0, 5)) {
    console.log(`    ${String(a.username).padEnd(22)} ${a.itemId}`);
}
if (aAnnuler.length > 5) console.log(`    … et ${aAnnuler.length - 5} autre(s)`);

if (!APPLY) {
    console.log('\n  Rien n\'a été écrit. Relancer avec --apply.\n');
    process.exit(0);
}

const { revokeGrant } = await import('../src/lib/collection/grant.ts');
let n = 0;
for (const a of aAnnuler) {
    await revokeGrant(db, a.userId, a.grantId);
    n++;
}
console.log(`\n  [ok] ${n} octroi(s) annulé(s).`);
console.log('  ⚠️ L\'ELO comprimé n\'est PAS restauré. Les valeurs d\'avant sont');
console.log(`     conservées dans seasons/*/standings si besoin.\n`);
