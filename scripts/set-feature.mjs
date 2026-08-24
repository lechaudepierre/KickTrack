/**
 * Change l'audience d'une fonctionnalité — c'est le bouton du « drop ».
 *
 * 'off' personne. Tout le monde reste sur le comportement V1.
 * 'admins' seuls les 3 créateurs. Mode de test, sur les vraies données.
 * 'everyone' la V2 devient la V1.
 *
 * Usage :
 * node scripts/set-feature.mjs # état actuel
 * node scripts/set-feature.mjs v2 admins # simulation
 * node scripts/set-feature.mjs v2 admins --apply # appliqué
 *
 * Aucun redéploiement n'est nécessaire : les joueurs voient le changement
 * à leur prochain chargement de page.
 */
import { db, APPLY, announceMode } from './_admin.mjs';

const KEYS = { v2: 'Toutes les nouveautés V2 (collection, personnalisation, saisons, modes de jeu…)' };
const AUDIENCES = ['off', 'admins', 'everyone'];

const [key, audience] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ref = db.collection('config').doc('features');

async function show() {
    const snap = await ref.get();
    const current = snap.exists ? snap.data() : {};
    console.log('État actuel :\n');
    for (const [k, label] of Object.entries(KEYS)) {
        const value = current[k] ?? 'off';
        const icon = value === 'everyone' ? '[actif]' : value === 'admins' ? '[partiel]' : '[inactif]';
        console.log(` ${icon} ${k.padEnd(16)} ${String(value).padEnd(10)} ${label}`);
    }
    console.log();
}

async function main() {
    if (!key) {
        announceMode('Drapeaux de fonctionnalité');
        await show();
        console.log(`Audiences possibles : ${AUDIENCES.join(' · ')}`);
        console.log(`Exemple : node scripts/set-feature.mjs v2 everyone --apply\n`);
        return;
    }

    if (!KEYS[key]) {
        console.error(`[echec] Fonctionnalité inconnue : « ${key} ». Connues : ${Object.keys(KEYS).join(', ')}`);
        process.exit(1);
    }
    if (!AUDIENCES.includes(audience)) {
        console.error(`[echec] Audience invalide : « ${audience} ». Attendu : ${AUDIENCES.join(' | ')}`);
        process.exit(1);
    }

    announceMode(`Drapeau ${key} → ${audience}`);
    await show();

    if (audience === 'everyone') {
        console.log('⚠️ « everyone » rend la fonctionnalité visible par TOUS LES JOUEURS.');
        console.log(' C\'est le drop. Réversible en repassant à « admins ».\n');
    }

    console.log(` ${key} → ${audience}`);
    if (APPLY) {
        await ref.set({ [key]: audience }, { merge: true });
        console.log('\n[ok] Appliqué. Effectif au prochain chargement de page des joueurs.');
    } else {
        console.log('\n Rien n\'a été écrit. Relancer avec --apply.');
    }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
