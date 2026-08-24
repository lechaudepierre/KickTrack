/**
 * Réconcilie le catalogue Firestore avec `scripts/catalog.data.mjs`.
 *
 * npm run catalog:sync # simulation
 * npm run catalog:sync -- --apply # applique
 *
 * Ce script est fait pour être lancé souvent, notamment quand Sacha livre un
 * lot de bannières. Il valide avant d'écrire.
 */
import { db, APPLY, announceMode } from './_admin.mjs';
import { CATALOG } from './catalog.data.mjs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const TYPES = ['banner', 'title', 'corps', 'maillot', 'short', 'pieds', 'chapeau'];
const RARITIES = ['commun', 'rare', 'epique', 'legendaire'];
const SOURCES = ['pack', 'saison', 'event', 'exploit', 'createur', 'defaut'];

function validate(items) {
    const errors = [];
    const warnings = [];
    const seen = new Set();

    for (const item of items) {
        const at = `« ${item.id ?? '(sans id)'} »`;
        if (!item.id) errors.push(`${at} : id manquant`);
        if (seen.has(item.id)) errors.push(`${at} : id en double`);
        seen.add(item.id);

        if (!TYPES.includes(item.type)) errors.push(`${at} : type « ${item.type} » inconnu`);
        if (!RARITIES.includes(item.rarity)) errors.push(`${at} : rareté « ${item.rarity} » inconnue`);
        if (!SOURCES.includes(item.source)) errors.push(`${at} : source « ${item.source} » inconnue`);
        if (!item.meta?.name) errors.push(`${at} : meta.name manquant`);

        if (item.type === 'title' && !item.meta?.text) {
            errors.push(`${at} : un titre doit porter meta.text`);
        }

        // Un asset déclaré mais absent du disque n'est pas bloquant : l'item
        // s'affiche en « Visuel à venir » et le fichier peut arriver plus tard.
        if (item.asset && !existsSync(join(PUBLIC_DIR, item.asset))) {
            warnings.push(`${at} : fichier absent → ${item.asset}`);
        }
    }
    return { errors, warnings };
}

/**
 * Sérialisation stable : Firestore ne garantit pas l'ordre des clés au retour,
 * donc un JSON.stringify direct signalerait tous les items comme modifiés à
 * chaque passage. On trie récursivement avant de comparer.
 */
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value).sort().map(k => [k, canonical(value[k])])
        );
    }
    return value;
}

const sameAs = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

async function main() {
    announceMode('Synchronisation du catalogue');

    const { errors, warnings } = validate(CATALOG);
    if (errors.length) {
        console.error('[echec] Catalogue invalide, rien n\'a été fait :\n');
        errors.forEach(e => console.error(` ${e}`));
        process.exit(1);
    }

    const existing = await db.collection('catalog').get();
    const current = new Map(existing.docs.map(d => [d.id, d.data()]));
    const wanted = new Map(CATALOG.map(i => [i.id, i]));

    const created = [], updated = [], unchanged = [], removed = [];

    for (const [id, item] of wanted) {
        if (!current.has(id)) created.push(item);
        else if (!sameAs(current.get(id), item)) updated.push(item);
        else unchanged.push(item);
    }
    for (const id of current.keys()) if (!wanted.has(id)) removed.push(id);

    const line = (icon, item) =>
        ` ${icon} ${item.id.padEnd(22)} ${item.type.padEnd(7)} ${item.rarity.padEnd(11)} ${item.asset || '—'}`;

    created.forEach(i => console.log(line('+', i)));
    updated.forEach(i => console.log(line('~', i)));
    if (unchanged.length) console.log(` · ${unchanged.length} item(s) inchangé(s)`);

    // ─── Suppressions : on protège ce que les joueurs possèdent ──────────────
    for (const id of removed) {
        const owners = await countOwners(id);
        if (owners > 0) {
            console.log(` [interdit] ${id.padEnd(22)} absent du fichier mais possédé par ${owners} joueur(s) → CONSERVÉ`);
        } else {
            console.log(` [echec] ${id.padEnd(22)} absent du fichier, possédé par personne → à supprimer`);
        }
    }

    if (warnings.length) {
        console.log(`\n⚠️ ${warnings.length} asset(s) pas encore déposé(s) — ces items s'afficheront en « Visuel à venir » :`);
        warnings.forEach(w => console.log(` ${w}`));
    }

    console.log(`\n${created.length} création(s), ${updated.length} mise(s) à jour, ${unchanged.length} inchangé(s).`);

    if (!APPLY) {
        console.log(' Rien n\'a été écrit. Relancer avec --apply.\n');
        return;
    }

    const batch = db.batch();
    for (const item of [...created, ...updated]) {
        batch.set(db.collection('catalog').doc(item.id), item);
    }
    for (const id of removed) {
        if (await countOwners(id) === 0) batch.delete(db.collection('catalog').doc(id));
    }
    await batch.commit();
    console.log('[ok] Catalogue synchronisé.\n');
}

/**
 * Combien de joueurs possèdent cet item ?
 * Sert de garde-fou : on ne supprime jamais du catalogue un item déjà distribué,
 * sinon il deviendrait inaffichable dans les inventaires.
 */
async function countOwners(itemId) {
    const snap = await db.collectionGroup('inventory').where('itemId', '==', itemId).limit(50).get();
    return snap.size;
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
