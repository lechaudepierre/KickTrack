/**
 * Fiche d'un item — ce qu'il est, et surtout COMMENT ON L'OBTIENT.
 *
 * Ouverte au clic sur n'importe quelle carte, possédée ou non. C'est le point
 * important : avant, un item verrouillé était un bouton désactivé qui ne disait
 * rien. Voir ce qu'on n'a pas ET savoir quoi faire pour l'avoir, c'est ce qui
 * donne envie de jouer.
 *
 * Générique : aucune connaissance d'un type d'item en particulier.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { CatalogItem } from '@/types/collection';
import { getTypeConfig } from '@/lib/collection/itemTypes';
import { getRarityConfig } from '@/lib/collection/rarity';
import { describeObtention, formatSeason } from '@/lib/collection/obtention';
import styles from './ItemDetailSheet.module.css';

const SOURCE_LABELS: Record<string, string> = {
    pack: 'Pack',
    saison: 'Récompense de saison',
    event: 'Event',
    exploit: 'Exploit',
    createur: 'Fondateur',
    defaut: 'De base',
};

interface ItemDetailSheetProps {
    item: CatalogItem;
    owned: boolean;
    equipped: boolean;
    /** Exemplaires possédés. */
    quantity?: number;
    /** Afficher la pastille de rareté ? Fausse pour une récompense de saison. */
    showRarity?: boolean;
    /**
     * Le spectateur peut-il équiper ? Faux quand il regarde la collection de
     * quelqu'un d'autre — on n'habille pas les autres.
     */
    canEquip?: boolean;
    onEquip: (item: CatalogItem) => void;
    onClose: () => void;
}

export default function ItemDetailSheet({ item, owned, equipped, quantity = 0, showRarity = true, canEquip = true, onEquip, onClose }: ItemDetailSheetProps) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const typeConfig = getTypeConfig(item.type);
    const rarity = getRarityConfig(item.rarity);
    const obtention = describeObtention(item);
    const season = formatSeason(item.meta.season);

    // Échap ferme la fiche, et le focus part sur la croix : sans ça, la
    // navigation au clavier resterait piégée derrière la fiche.
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const equipable = owned && typeConfig.available && canEquip;

    return (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            {/* Le clic sur la fiche elle-même ne doit pas la refermer. */}
            <div className={styles.sheet}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={item.meta.name}
            >
                <button type="button" ref={closeRef} onClick={onClose}
                    className={styles.close} aria-label="Fermer">
                    ×
                </button>

                <div className={styles.preview}>
                    {typeConfig.preview === 'text' ? (
                        <div className={styles.textPreview}>
                            {item.meta.text ?? item.meta.name}
                        </div>
                    ) : (
                        <img src={item.asset} alt={item.meta.name}
                            className={typeConfig.preview === 'wide-image' ? styles.wide : styles.square}
                            draggable={false}
                        />
                    )}
                </div>

                <h2 className={styles.name}>{item.meta.name}</h2>

                <div className={styles.tags}>
                    {showRarity && (
                        <span className={styles.pill}
                            style={{ color: rarity.color, borderColor: rarity.color, background: rarity.background }}
                        >
                            {rarity.label}
                        </span>
                    )}
                    <span className={styles.tag}>{typeConfig.label}</span>
                    <span className={styles.tag}>
                        {SOURCE_LABELS[item.source] ?? item.source}{season ? ` · ${season}` : ''}
                    </span>
                    {quantity > 1 && (
                        <span className={styles.tag}>{quantity} exemplaires</span>
                    )}
                    {/* L'information que le joueur regarde en premier : est-ce
                        que ça peut tomber, ou est-ce que c'est hors d'atteinte ?
                        Elle est donc à part, jamais noyée dans la phrase. */}
                    <span className={obtention.fromPack ? styles.tag : styles.tagPrestige}>
                        {obtention.fromPack ? 'Dans les packs' : 'Jamais en pack'}
                    </span>
                </div>

                <div className={styles.obtention}>
                    <p className={styles.obtentionTitle}>
                        {owned ? 'Provenance' : 'Comment l\'obtenir'}
                    </p>
                    <p className={styles.obtentionText}>{obtention.text}</p>
                </div>

                {!typeConfig.available && (
                    <p className={styles.note}>
                        Ce type d&apos;item n&apos;est pas encore affiché dans le jeu. Tu peux le
                        collectionner, pas encore l&apos;équiper.
                    </p>
                )}

                {equipable && (
                    <button type="button" className={styles.action} onClick={() => onEquip(item)}>
                        {equipped ? 'Retirer' : 'Équiper'}
                    </button>
                )}

                {!owned && (
                    <p className={styles.locked}>{canEquip ? 'Pas encore débloqué' : 'Ne le possède pas'}</p>
                )}

                {owned && equipped && !canEquip && (
                    <p className={styles.locked}>Équipé</p>
                )}
            </div>
        </div>
    );
}
