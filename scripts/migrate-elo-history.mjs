/**
 * D7 / chantier 1.4 — alléger les profils en SUPPRIMANT `stats.eloHistory`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI SUPPRIMER PLUTÔT QUE DÉPLACER
 * ═══════════════════════════════════════════════════════════════════════════
 * J'ai d'abord proposé de sortir ce tableau en sous-collection. En cherchant
 * qui le lit vraiment, il s'avère que **personne n'en a besoin** :
 *
 *   - le graphique d'ELO du profil est recalculé DEPUIS LES PARTIES
 *     (`statsCalculator`), pas depuis ce tableau ;
 *   - `computeMovements` (les flèches du classement) lit `stats.history`,
 *     le point quotidien, qui reste ;
 *   - le seul usage réel est le PIC d'ELO — une seule valeur.
 *
 * Or 140 profils sur 141 n'ont pas de champ `peakElo` : le tableau en est
 * aujourd'hui la seule source. On sauve donc la valeur, puis on jette le
 * tableau. Zéro sous-collection à maintenir, zéro lecture supplémentaire.
 *
 * DEUX PHASES SÉPARÉES, et c'est volontaire : on n'efface rien avant d'avoir
 * vérifié que la valeur est bien sauvée.
 *
 *   node scripts/migrate-elo-history.mjs --phase peak   [--apply]
 *   node scripts/migrate-elo-history.mjs --phase purge  [--apply]
 */
import { db, APPLY, announceMode } from './_admin.mjs';
import { FieldValue } from 'firebase-admin/firestore';

const idx = process.argv.indexOf('--phase');
const phase = idx > -1 ? process.argv[idx + 1] : null;
if (phase !== 'peak' && phase !== 'purge') {
    console.error('Usage : --phase peak | --phase purge  [--apply]');
    process.exit(1);
}

announceMode(phase === 'peak' ? 'Sauvegarde du pic d\'ELO' : 'Suppression de eloHistory');

const users = await db.collection('users').get();
const pic = (st) => Math.max(
    st.peakElo ?? 0,
    st.elo ?? 1000,
    ...(Array.isArray(st.eloHistory) ? st.eloHistory.map(e => e?.elo ?? 0) : []),
);

if (phase === 'peak') {
    const aFaire = users.docs.filter(d => {
        const st = d.data().stats ?? {};
        return (st.peakElo ?? -1) < pic(st);
    });
    console.log(`  ${aFaire.length} profil(s) à corriger sur ${users.size}\n`);
    for (const d of aFaire.slice(0, 4)) {
        const st = d.data().stats ?? {};
        console.log(`    ${String(d.data().username).padEnd(22)} peakElo ${st.peakElo ?? '(absent)'} -> ${pic(st)}`);
    }
    if (!APPLY) { console.log('\n  Rien écrit. Relancer avec --apply.\n'); process.exit(0); }

    let lot = db.batch(), n = 0;
    for (const d of aFaire) {
        lot.update(d.ref, { 'stats.peakElo': pic(d.data().stats ?? {}) });
        if (++n % 400 === 0) { await lot.commit(); lot = db.batch(); }
    }
    if (n % 400 !== 0) await lot.commit();
    console.log(`\n  [ok] ${aFaire.length} pic(s) sauvé(s).\n`);
    process.exit(0);
}

// ─── Phase 2 : la purge, et son garde-fou ────────────────────────────────
const risque = users.docs.filter(d => {
    const st = d.data().stats ?? {};
    return Array.isArray(st.eloHistory) && st.eloHistory.length > 0 && (st.peakElo ?? -1) < pic(st);
});

if (risque.length > 0) {
    console.error(`  REFUS : ${risque.length} profil(s) ont un pic non sauvé.`);
    console.error('  Lancer d\'abord « --phase peak --apply ».\n');
    process.exit(1);
}

const avec = users.docs.filter(d => Array.isArray(d.data().stats?.eloHistory));
const octets = avec.reduce((s, d) => s + Buffer.byteLength(JSON.stringify(d.data().stats.eloHistory)), 0);
console.log(`  ${avec.length} profil(s) portent un eloHistory, soit ${(octets / 1024).toFixed(0)} Ko`);
console.log('  Pic vérifié comme sauvé sur TOUS les profils.\n');

if (!APPLY) { console.log('  Rien écrit. Relancer avec --apply.\n'); process.exit(0); }

let lot = db.batch(), n = 0;
for (const d of avec) {
    lot.update(d.ref, { 'stats.eloHistory': FieldValue.delete() });
    if (++n % 400 === 0) { await lot.commit(); lot = db.batch(); }
}
if (n % 400 !== 0) await lot.commit();
console.log(`  [ok] ${avec.length} tableau(x) supprimé(s), ${(octets / 1024).toFixed(0)} Ko libérés.\n`);
