/**
 * Garde-fou : chaque asset cité par le catalogue existe-t-il réellement ?
 *
 * Contrôle les DEUX sources, parce qu'elles peuvent diverger :
 *   - `scripts/catalog.data.mjs`, ce qu'on veut ;
 *   - le catalogue en PRODUCTION, ce que les joueurs voient vraiment.
 *
 * Pourquoi les deux : le 21/08, un fichier a été renommé après la
 * synchronisation. Le fichier local était bon, la production pointait encore
 * sur l'ancien nom, et la bannière s'affichait « Visuel à venir » pour tout le
 * monde. Ne vérifier que le fichier local n'aurait rien vu.
 *
 * Lancé par `npm run check:catalog`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { CATALOG } from './catalog.data.mjs';

const problemes = [];

for (const item of CATALOG) {
    if (item.asset && !existsSync('public' + item.asset)) {
        problemes.push(`catalog.data.mjs : « ${item.id} » -> ${item.asset} (fichier absent)`);
    }
}

// La production, si la clé de service est là. Sans elle, on ne bloque pas :
// le contrôle local reste utile en intégration continue.
if (existsSync('serviceAccountKey.json')) {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    initializeApp({ credential: cert(JSON.parse(readFileSync('serviceAccountKey.json'))) });

    const snap = await getFirestore().collection('catalog').get();
    for (const doc of snap.docs) {
        const asset = doc.data().asset;
        if (asset && !existsSync('public' + asset)) {
            problemes.push(`PRODUCTION : « ${doc.id} » -> ${asset} (fichier absent)`
                + ` — relancer « node scripts/sync-catalog.mjs --apply »`);
        }
    }
}

if (problemes.length) {
    console.error('\nAssets de catalogue introuvables :\n');
    for (const p of problemes) console.error('  ' + p);
    console.error('');
    process.exit(1);
}
console.log(`Catalogue : ${CATALOG.length} items, tous les assets sont en place.`);
