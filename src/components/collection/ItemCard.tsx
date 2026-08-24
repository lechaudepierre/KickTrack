/**
 * Carte d'un item de collection — générique, quel que soit son type.
 *
 * Ne contient AUCUN cas particulier par type : la façon de prévisualiser vient
 * de `ITEM_TYPES[type].preview`, la couleur vient de la rareté. Ajouter un type
 * de collectable n'oblige pas à toucher ce fichier.
 */

'use client';

import { useState } from 'react';
import type { CatalogItem } from '@/types/collection';
import { getTypeConfig } from '@/lib/collection/itemTypes';
import { getRarityConfig } from '@/lib/collection/rarity';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import styles from './ItemCard.module.css';

interface ItemCardProps {
    item: CatalogItem;
    owned: boolean;
    equipped: boolean;
    /** Exemplaires possédés. Affiché seulement à partir de deux. */
    quantity?: number;
    /**
     * Afficher la pastille de rareté ?
     *
     * Fausse dans les sections de saison : personne ne « tire » un Grand
     * Master, on l'atteint. Écrire « Légendaire » dessus suggère une chance
     * là où il n'y en a aucune.
     */
    showRarity?: boolean;
    onClick?: (item: CatalogItem) => void;
}

const SOURCE_LABELS: Record<string, string> = {
    pack: 'Pack',
    saison: 'Récompense de saison',
    event: 'Event',
    exploit: 'Exploit',
    createur: 'Fondateur',
    defaut: 'De base',
};

export default function ItemCard({ item, owned, equipped, quantity = 0, showRarity = true, onClick }: ItemCardProps) {
    // Détecté au chargement de l'image, pas deviné depuis l'extension : le jour
    // où le fichier est déposé, il s'affiche sans qu'on touche au code.
    const [assetBroken, setAssetBroken] = useState(false);

    const typeConfig = getTypeConfig(item.type);
    const rarity = getRarityConfig(item.rarity);
    const isText = typeConfig.preview === 'text';
    const shapeClass = typeConfig.preview === 'wide-image' ? styles.wideImage : styles.squareImage;

    return (
        <button type="button"
            className={[
                styles.card,
                owned ? '' : styles.locked,
                equipped ? styles.equipped : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onClick?.(item)}
            /* Une carte VERROUILLÉE reste cliquable : c'est justement là qu'on
               a besoin de savoir comment l'obtenir. Avant, c'était un bouton
               désactivé qui ne disait rien. */
            disabled={!onClick}
            aria-label={`${item.meta.name} — ${rarity.label}${owned ? '' : ' (non débloqué)'}`}
        >
            <div className={styles.visualWrap}>
                {/* Un titre n'a pas d'asset : son visuel EST son texte, et ce
                    texte n'a AUCUNE couleur de rareté — il prendra celle de la
                    bannière sur laquelle il s'affichera. Le colorer ici
                    mentirait sur le rendu final. */}
                {isText ? (
                    <div className={styles.textPreview}>
                        {item.meta.text ?? item.meta.name}
                    </div>
                ) : assetBroken ? (
                    <div className={`${styles.placeholder} ${shapeClass}`}>Visuel à venir</div>
                ) : (
                    <img
                        src={item.asset}
                        alt={item.meta.name}
                        className={`${styles.visual} ${shapeClass}`}
                        draggable={false}
                        onError={() => setAssetBroken(true)}
                    />
                )}

                {/* Cadenas au centre, et l'image GARDE SA COULEUR.
                    Demande de Sacha (21/08) : « il faut leur mettre un cadenas,
                    mais ne pas leur enlever la couleur ». Un item désaturé n'a
                    plus l'air désirable — or c'est exactement ce qu'on veut
                    qu'il soit. */}
                {!owned && (
                    <span className={styles.lockOverlay} aria-hidden="true">
                        <LockClosedIcon className={styles.lockIcon} />
                    </span>
                )}

                {equipped && <span className={styles.equippedBadge}>Équipé</span>}
            </div>

            <div className={styles.body}>
                <div>
                    <div className={styles.name}>
                        {item.meta.name}
                        {/* Le compte se lit À CÔTÉ DU NOM (demande de Sacha,
                            21/08) plutôt qu'en coin de vignette : c'est une
                            propriété de l'item, pas une annotation sur l'image.
                            Un seul exemplaire n'est jamais compté — « x1 »
                            partout serait du bruit. */}
                        {quantity > 1 && <span className={styles.quantity}>x{quantity}</span>}
                    </div>
                    {showRarity && (
                        <div className={styles.source}>
                            {SOURCE_LABELS[item.source] ?? item.source}
                            {item.meta.season ? ` · ${item.meta.season.replace('season_', 'saison ')}` : ''}
                        </div>
                    )}
                </div>
                {showRarity && (
                    <span className={styles.rarityPill}
                        style={{ color: rarity.color, borderColor: rarity.color, background: rarity.background }}
                    >
                        {rarity.label}
                    </span>
                )}
            </div>
        </button>
    );
}
