/**
 * OUVERTURE D'UN PACK — l'animation.
 *
 * Trois temps, et un principe par temps :
 *   1. CHARGE   le pack vibre et monte en intensité. La couleur est celle de
 *               la MEILLEURE rareté que le pack peut donner, jamais celle qui
 *               a été tirée — sinon on vend la mèche avant la révélation.
 *   2. RUPTURE  éclat bref, le pack disparaît.
 *   3. RÉVÉLATION l'item apparaît, aux couleurs de SA rareté cette fois.
 *
 * SAUTABLE AU PREMIER TAP. C'est la vingtième ouverture qui décide si le
 * système est agréable, pas la première : une animation qu'on ne peut pas
 * couper devient une corvée.
 *
 * Le composant ne TIRE RIEN. Il reçoit l'item déjà décidé — le tirage
 * appartient au serveur, et il sera écrit avant que cette animation démarre.
 */

'use client';

import { useEffect, useState } from 'react';
import type { CatalogItem, Rarity } from '@/types/collection';
import { getRarityConfig } from '@/lib/collection/rarity';
import { getTypeConfig } from '@/lib/collection/itemTypes';
import styles from './PackOpening.module.css';

type Phase = 'charge' | 'rupture' | 'reveal';

const DUREE_CHARGE = 1400;
const DUREE_RUPTURE = 550;

interface PackOpeningProps {
    item: CatalogItem;
    /** Meilleure rareté que ce pack peut donner — pilote la couleur de charge. */
    topRarity?: Rarity;
    onClose: () => void;
}

export default function PackOpening({ item, topRarity = 'legendaire', onClose }: PackOpeningProps) {
    const [phase, setPhase] = useState<Phase>('charge');

    const rarity = getRarityConfig(item.rarity);
    const charge = getRarityConfig(topRarity);
    const typeConfig = getTypeConfig(item.type);
    const estLegendaire = item.rarity === 'legendaire';

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('rupture'), DUREE_CHARGE);
        const t2 = setTimeout(() => setPhase('reveal'), DUREE_CHARGE + DUREE_RUPTURE);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Un tap saute directement à la révélation ; une fois révélé, il ferme.
    const auTap = () => (phase === 'reveal' ? onClose() : setPhase('reveal'));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' || e.key === ' ') auTap();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <div className={styles.overlay}
            onClick={auTap}
            role="dialog"
            aria-modal="true"
            aria-label={phase === 'reveal' ? `${item.meta.name} — ${rarity.label}` : 'Ouverture du pack'}
            style={{
                ['--charge-color' as string]: charge.color,
                ['--rarity-color' as string]: rarity.color,
                ['--rarity-background' as string]: rarity.background,
            }}
        >
            {phase !== 'reveal' && (
                <div className={`${styles.pack} ${phase === 'rupture' ? styles.packBurst : ''}`}>
                    <div className={styles.packHalo} />
                    <div className={styles.packBox} />
                    <p className={styles.hint}>Touche pour passer</p>
                </div>
            )}

            {phase === 'reveal' && (
                <div className={`${styles.reveal} ${estLegendaire ? styles.revealLegendary : ''}`}>
                    {/* Le légendaire casse la règle : il déborde du cadre.
                        Même principe que pour les bannières — un palier qui ne
                        se distingue que par une couleur ne se remarque pas. */}
                    {estLegendaire && <div className={styles.rays} aria-hidden="true" />}

                    <p className={styles.rarityLabel}>{rarity.label}</p>

                    <div className={styles.visual}>
                        {typeConfig.preview === 'text' ? (
                            <div className={styles.textPreview}>{item.meta.text ?? item.meta.name}</div>
                        ) : (
                            <img src={item.asset} alt={item.meta.name} className={styles.image} draggable={false} />
                        )}
                    </div>

                    <p className={styles.name}>{item.meta.name}</p>
                    <p className={styles.typeLabel}>{typeConfig.label}</p>

                    <button type="button" className={styles.close} onClick={onClose}>
                        Continuer
                    </button>
                </div>
            )}
        </div>
    );
}
