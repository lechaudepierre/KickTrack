/**
 * Page Collection — chantier 2.10.
 *
 * Un seul écran qui montre TOUT le catalogue : ce qu'on possède, ce qu'on a
 * équipé, et ce qui reste à débloquer. Voir les items verrouillés est le point
 * central — c'est ce qui donne envie de jouer pour les obtenir.
 *
 * Générique par construction : la page parcourt le registre `ITEM_TYPES` et ne
 * connaît aucun type en particulier. Ajouter « animation de but » au registre
 * la fait apparaître ici sans qu'on touche à ce fichier.
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import { useAuthStore } from '@/lib/stores/authStore';
import { useFeature } from '@/lib/features';
import { getFirebaseDb } from '@/lib/firebase/config';
import { loadCatalog } from '@/lib/collection/catalogClient';
import { equipItem } from '@/lib/collection/inventory';
import { readQuantity } from '@/lib/collection/quantity';
import { getTypeConfig } from '@/lib/collection/itemTypes';
import { buildSections } from '@/lib/collection/sections';
import ItemCard from '@/components/collection/ItemCard';
import ItemDetailSheet from '@/components/collection/ItemDetailSheet';
import PackOpening from '@/components/collection/PackOpening';
import { buildPackPool, drawFromPool, rarityOdds, isDefaultItem } from '@/lib/collection/packPool';
import { getRarityConfig } from '@/lib/collection/rarity';
import { isAdmin } from '@/lib/utils/adminUtils';
import { loadMyPacks, openPackRequest, type UnopenedPack } from '@/lib/collection/packsClient';
import BottomNav from '@/components/common/BottomNav';
import { FieldBackground } from '@/components/FieldDecorations';
import type { CatalogItem, Equipped, ItemType, Rarity } from '@/types/collection';

import pageStyles from '@/styles/content-page.module.css';
import styles from './page.module.css';
import { PageHeader } from '@/components/common/ui';

/**
 * `useSearchParams` oblige à une frontière Suspense : sans elle, Next refuse
 * de pré-rendre la page et bascule tout l'arbre en rendu client.
 */
export default function CollectionPage() {
    return (
        <Suspense fallback={null}>
            <CollectionView />
        </Suspense>
    );
}

function CollectionView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Consultation de la collection d'un autre joueur — chantier 4.9.
    // Voir une bannière chez quelqu'un est ce qui donne envie de l'obtenir.
    // En lecture seule, évidemment : on ne touche pas à l'inventaire d'autrui.
    const viewedUserId = searchParams.get('joueur');
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();
    const v2Enabled = useFeature('v2');

    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    // Map plutôt que Set : on a besoin du NOMBRE d'exemplaires, pas seulement
    // de savoir si l'item est possédé. `Map.has()` remplace `Set.has()` tel quel.
    const [owned, setOwned] = useState<Map<string, number>>(new Map());
    const [equipped, setEquipped] = useState<Equipped>({});
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
    // « tout » montre aussi ce qui reste à débloquer — c'est ce qui donne envie
    // de jouer. « possédés » sert quand la collection devient grande.
    const [filter, setFilter] = useState<'all' | 'owned'>('all');
    // Item dont la fiche est ouverte. Le clic sur une carte ouvre TOUJOURS la
    // fiche, possédée ou non : un seul geste, un seul modèle mental, et c'est
    // le seul endroit qui explique comment obtenir ce qu'on n'a pas.
    const [selected, setSelected] = useState<CatalogItem | null>(null);
    // Filtre par type. `all` reste le défaut : voir tout le catalogue d'un coup
    // est ce qui donne envie. Le filtre sert quand la collection grossit.
    // Le filtre porte sur les SECTIONS, pas seulement sur les types : une
    // saison est une section à part entière, il faut pouvoir la choisir aussi.
    const [sectionFilter, setSectionFilter] = useState<string>('all');
    // Onglet de premier niveau. Les packs ne sont pas encore distribués, mais
    // l'onglet existe déjà : c'est là que Sacha teste les animations, et c'est
    // là qu'ils apparaîtront sans qu'on retouche la navigation.
    const [tab, setTab] = useState<'items' | 'packs'>('items');
    const [opening, setOpening] = useState<CatalogItem | null>(null);
    const [viewedName, setViewedName] = useState<string | null>(null);
    const [packs, setPacks] = useState<UnopenedPack[]>([]);
    const [openingPack, setOpeningPack] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [initialize]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/');
    }, [authLoading, isAuthenticated, router]);

    // Fonctionnalité pas encore livrée pour ce joueur : la page n'existe pas
    // pour lui. On renvoie au profil plutôt que d'afficher un écran « bientôt »,
    // qui révélerait la nouveauté avant le drop.
    useEffect(() => {
        if (!authLoading && isAuthenticated && !v2Enabled) router.push('/profile');
    }, [authLoading, isAuthenticated, v2Enabled, router]);

    // Ses propres packs. Pas de chargement quand on regarde quelqu'un d'autre :
    // les règles Firestore l'interdisent, et ça n'aurait aucun sens.
    useEffect(() => {
        if (!user || !v2Enabled || viewedUserId) return;
        let cancelled = false;
        loadMyPacks()
            .then(p => { if (!cancelled) setPacks(p); })
            .catch(err => console.error('[packs] lecture impossible', err));
        return () => { cancelled = true; };
    }, [user, v2Enabled, viewedUserId]);

    // Qui regarde-t-on ? Soi-même par défaut.
    const cibleId = viewedUserId ?? user?.userId;
    const readOnly = !!viewedUserId && viewedUserId !== user?.userId;

    useEffect(() => {
        if (!user || !v2Enabled || !cibleId) return;
        let cancelled = false;

        (async () => {
            try {
                const db = getFirebaseDb();
                const [items, inventorySnap, cibleSnap] = await Promise.all([
                    loadCatalog(),
                    getDocs(collection(db, 'users', cibleId, 'inventory')),
                    // Le profil de la cible sert au titre ET à `equipped` :
                    // en lecture seule, on montre ce que LUI a équipé.
                    readOnly ? getDoc(doc(db, 'users', cibleId)) : Promise.resolve(null),
                ]);
                if (cancelled) return;

                setCatalog(Object.values(items));
                setOwned(new Map(inventorySnap.docs.map(
                    d => [d.id, readQuantity(d.data())] as const
                )));

                if (readOnly) {
                    const data = cibleSnap?.data();
                    setViewedName((data?.username as string) ?? 'Joueur');
                    setEquipped((data?.equipped ?? {}) as Equipped);
                } else {
                    setViewedName(null);
                    setEquipped((user.equipped ?? {}) as Equipped);
                }
            } catch (err) {
                console.error('[collection] chargement impossible', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [user, v2Enabled, cibleId, readOnly]);

    // Le découpage vit dans `lib/collection/sections.ts`, testé : la page ne
    // fait que l'afficher. C'est là que les récompenses de saison sortent des
    // sections de type pour former la leur.
    const allSections = useMemo(() => buildSections(catalog), [catalog]);

    /**
     * Le joueur possède-t-il cet item ?
     *
     * Un item de base est possédé sans figurer dans l'inventaire : c'est une
     * propriété du catalogue, pas un octroi. La question se pose partout dans
     * cette page, donc elle vit ici et nulle part ailleurs.
     */
    const possede = useCallback(
        (item: CatalogItem) => isDefaultItem(item) || owned.has(item.id),
        [owned],
    );

    const sections = useMemo(() => {
        return allSections
            .filter(section => sectionFilter === 'all' || section.key === sectionFilter)
            .map(section => ({
                ...section,
                visibles: filter === 'owned'
                    ? section.items.filter(possede)
                    : section.items,
            }))
            // Une section vide après filtrage disparaît, sinon la vue
            // « possédés » serait une liste de titres sans contenu.
            .filter(section => filter === 'all' || section.visibles.length > 0);
    }, [allSections, filter, sectionFilter, possede]);

    const totalOwned = catalog.filter(possede).length;

    // Ce qu'un pack peut donner, et avec quelles chances. Le calcul vit dans
    // `packPool`, testé : la page ne fait que l'afficher.
    const packPool = useMemo(() => buildPackPool(catalog), [catalog]);
    const odds = useMemo(() => rarityOdds(packPool), [packPool]);
    const canTest = isAdmin(user?.email);

    /** Ouvre un VRAI pack : le serveur tire, le client ne fait qu'afficher. */
    const ouvrirPack = async (packId: string) => {
        setOpeningPack(packId);
        try {
            const resultat = await openPackRequest(packId);
            const item = catalog.find(i => i.id === resultat.itemId);
            if (item) setOpening(item);
            setPacks(p => p.filter(x => x.id !== packId));
            // L'inventaire local suit, pour que la carte passe en « possédé »
            // sans recharger la page.
            setOwned(prev => {
                const suivant = new Map(prev);
                suivant.set(resultat.itemId, (suivant.get(resultat.itemId) ?? 0) + 1);
                return suivant;
            });
        } catch (err) {
            setFeedback({ text: err instanceof Error ? err.message : 'Erreur', ok: false });
            setTimeout(() => setFeedback(null), 2500);
        } finally {
            setOpeningPack(null);
        }
    };

    /** Ouvre un pack pour de faux, à des fins de test d'animation. */
    const testOpen = (forcedRarity?: Rarity) => {
        const pool = forcedRarity
            ? packPool.filter(i => i.rarity === forcedRarity)
            : packPool;
        // `Math.random` dans un gestionnaire d'événement : hors du rendu, donc
        // légitime. Le vrai tirage, lui, se fera côté serveur.
        const tire = drawFromPool(pool.length ? pool : packPool, Math.random);
        if (tire) setOpening(tire);
    };

    const handleEquip = async (item: CatalogItem) => {
        const isEquipped = equipped[item.type]?.itemId === item.id;
        try {
            // Recliquer sur l'item équipé le retire, si le slot l'autorise.
            const next = await equipItem(item.type, isEquipped ? null : item.id);
            setEquipped(next);
            setFeedback({ text: isEquipped ? 'Retiré' : `${item.meta.name} équipé`, ok: true });
            setSelected(null);
        } catch (err) {
            setFeedback({ text: err instanceof Error ? err.message : 'Erreur', ok: false });
        }
        setTimeout(() => setFeedback(null), 2500);
    };

    if (authLoading || isLoading) {
        return (
            <div className={pageStyles.pageContainer}>
                <FieldBackground />
                <div className={pageStyles.contentWrapper}>
                    <p className={styles.empty}>Chargement de la collection…</p>
                </div>
            </div>
        );
    }

    return (
        <div className={pageStyles.pageContainer}>
            <FieldBackground />
            <div className={pageStyles.contentWrapper}>
                <PageHeader
                    title={readOnly ? `Collection de ${viewedName ?? '…'}` : 'Collection'}
                    subtitle={`${totalOwned} / ${catalog.length} items débloqués`}
                    {...(readOnly ? { onBack: () => router.push(`/profile/${viewedUserId}`) } : {})}
                />

                {!readOnly && (
                <div className={styles.tabBar} role="tablist" aria-label="Sections de la collection">
                    <button type="button" role="tab" aria-selected={tab === 'items'}
                        className={`${styles.tab} ${tab === 'items' ? styles.tabActive : ''}`}
                        onClick={() => setTab('items')}
                    >
                        Items
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'packs'}
                        className={`${styles.tab} ${tab === 'packs' ? styles.tabActive : ''}`}
                        onClick={() => setTab('packs')}
                    >
                        Packs
                        {/* Même repère que dans la barre de navigation : une
                            fois dans la collection, il faut encore savoir dans
                            quel onglet ça se passe. */}
                        {packs.length > 0 && (
                            <span className={styles.tabBadge}>{packs.length}</span>
                        )}
                    </button>
                </div>
                )}

                {!readOnly && tab === 'packs' && (
                    <section className={styles.packsPanel}>
                        <p className={styles.packsCount}>
                            {packs.length === 0
                                ? 'Aucun pack à ouvrir'
                                : `${packs.length} pack${packs.length > 1 ? 's' : ''} à ouvrir`}
                        </p>
                        <p className={styles.packsHelp}>
                            Un pack toutes les 10 parties jouées.
                        </p>

                        {packs.length > 0 && (
                            <div className={styles.packList}>
                                {packs.map(pack => (
                                    <button key={pack.id} type="button"
                                        className={styles.packButton}
                                        disabled={openingPack !== null}
                                        onClick={() => ouvrirPack(pack.id)}
                                    >
                                        {openingPack === pack.id ? 'Ouverture…' : `Ouvrir le pack n°${pack.index}`}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className={styles.oddsBlock}>
                            <p className={styles.oddsTitle}>
                                Chances par rareté — {packPool.length} item{packPool.length > 1 ? 's' : ''} tirable{packPool.length > 1 ? 's' : ''}
                            </p>
                            <ul className={styles.oddsList}>
                                {(['legendaire', 'epique', 'rare', 'commun'] as Rarity[])
                                    .filter(r => odds[r] > 0)
                                    .map(r => (
                                        <li key={r} className={styles.oddsRow}>
                                            <span style={{ color: getRarityConfig(r).color }}>
                                                {getRarityConfig(r).label}
                                            </span>
                                            <span className={styles.oddsValue}>{odds[r].toFixed(1)} %</span>
                                        </li>
                                    ))}
                            </ul>
                        </div>

                        {canTest && (
                            <div className={styles.adminBlock}>
                                <p className={styles.adminTitle}>Test d&apos;animation — admin</p>
                                <p className={styles.adminHelp}>
                                    Rien n&apos;est octroyé&nbsp;: l&apos;animation seule est jouée.
                                    Un tap la saute.
                                </p>
                                <div className={styles.adminButtons}>
                                    <button type="button" className={styles.adminButton}
                                        onClick={() => testOpen()}>
                                        Tirage réel
                                    </button>
                                    {(['commun', 'rare', 'epique', 'legendaire'] as Rarity[]).map(r => (
                                        <button key={r} type="button" className={styles.adminButton}
                                            style={{ borderColor: getRarityConfig(r).color }}
                                            onClick={() => testOpen(r)}
                                        >
                                            {getRarityConfig(r).label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {(readOnly || tab === 'items') && (
                <>
                <div className={styles.filterBar} role="group" aria-label="Filtrer la collection">
                    <button type="button"
                        className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
                        onClick={() => setFilter('all')}
                        aria-pressed={filter === 'all'}
                    >
                        Tout le catalogue
                    </button>
                    <button type="button"
                        className={`${styles.filterButton} ${filter === 'owned' ? styles.filterActive : ''}`}
                        onClick={() => setFilter('owned')}
                        aria-pressed={filter === 'owned'}
                    >
                        {readOnly ? 'Sa collection' : 'Ma collection'} ({totalOwned})
                    </button>
                </div>

                {/* Filtre par type. Affiché seulement s'il y a au moins deux
                    types au catalogue : un seul onglet « Bannières » à côté de
                    « Tout » ne filtrerait rien. */}
                {allSections.length > 1 && (
                    <div className={styles.typeBar} role="group" aria-label="Filtrer la collection">
                        <button type="button"
                            className={`${styles.typeChip} ${sectionFilter === 'all' ? styles.typeChipActive : ''}`}
                            onClick={() => setSectionFilter('all')}
                            aria-pressed={sectionFilter === 'all'}
                        >
                            Tout
                        </button>
                        {allSections.map(section => (
                            <button key={section.key} type="button"
                                className={`${styles.typeChip} ${sectionFilter === section.key ? styles.typeChipActive : ''}`}
                                onClick={() => setSectionFilter(section.key)}
                                aria-pressed={sectionFilter === section.key}
                            >
                                {section.label}
                                <span className={styles.typeChipCount}>
                                    {section.items.filter(possede).length}/{section.items.length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {catalog.length === 0 && (
                    <p className={styles.empty}>
                        Le catalogue est vide ou inaccessible. Si tu es admin : vérifie que les règles
                        Firestore sont déployées (<code>npm run rules:deploy</code>).
                    </p>
                )}

                {filter === 'owned' && totalOwned === 0 && catalog.length > 0 && (
                    <p className={styles.empty}>
                        Tu n&apos;as encore rien débloqué. Passe sur « Tout le catalogue » pour voir
                        ce qu&apos;il y a à gagner.
                    </p>
                )}

                {sections.map(section => (
                    <section key={section.key} className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                {section.label}
                                {!section.available && <span className={styles.soon}>Bientôt</span>}
                            </h2>
                            <span className={styles.sectionCount}>
                                {section.items.filter(possede).length} / {section.items.length}
                            </span>
                        </div>
                        <p className={styles.sectionDescription}>{section.description}</p>

                        {section.visibles.length === 0 ? (
                            <p className={styles.empty}>Aucun item pour l&apos;instant.</p>
                        ) : (
                            <div className={`${styles.grid} ${
                                // Une section peut mêler plusieurs types : la grille
                                // carrée ne s'applique que si TOUT y tient.
                                section.visibles.every(i => getTypeConfig(i.type).preview === 'square-image')
                                    ? styles.gridSquare : ''
                            }`}>
                                {section.visibles.map(item => (
                                    <ItemCard key={item.id}
                                        item={item}
                                        owned={possede(item)}
                                        quantity={owned.get(item.id) ?? 0}
                                        equipped={equipped[item.type]?.itemId === item.id}
                                        showRarity={section.showRarity}
                                        onClick={setSelected}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                ))}

                </>
                )}

                {selected && (
                    <ItemDetailSheet item={selected}
                        showRarity={allSections.find(s => s.items.some(i => i.id === selected.id))?.showRarity ?? true}
                        owned={possede(selected)}
                        quantity={owned.get(selected.id) ?? 0}
                        equipped={equipped[selected.type]?.itemId === selected.id}
                        onEquip={handleEquip}
                        canEquip={!readOnly}
                        onClose={() => setSelected(null)}
                    />
                )}

                {opening && (
                    <PackOpening item={opening} onClose={() => setOpening(null)} />
                )}

                {feedback && (
                    <div className={`${styles.feedback} ${feedback.ok ? styles.feedbackOk : styles.feedbackError}`}>
                        {feedback.text}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
