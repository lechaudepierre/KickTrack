/**
 * LE TITRE ÉQUIPÉ, SOUS LE PSEUDO.
 *
 * Un titre n'est qu'un texte. Il n'a donc PAS de couleur propre : il prend
 * celle du contexte où il s'affiche — c'est-à-dire celle de la bannière, qui
 * la pose déjà dans `--banner-text-color`.
 *
 * Sacha, 22/08 : « il ne faut pas leur mettre des couleurs. Il faut toujours
 * que ce soit le bon texte en fonction de où ça se met, et donc ça se met sur
 * la bannière. C'est juste un texte qui se met en dessous du pseudo. »
 *
 * Avant ce composant, on pouvait équiper un titre et **il ne s'affichait nulle
 * part**. La collection permettait donc de gagner puis d'équiper un objet
 * strictement invisible.
 */

'use client';

import { useCatalog, getCachedItem } from '@/lib/collection/catalogClient';
import type { Equipped } from '@/types/collection';
import styles from './PlayerTitle.module.css';

interface PlayerTitleProps {
    equipped?: Equipped | null;
    /** Variante d'affichage : une ligne de classement a moins de place. */
    compact?: boolean;
}

export default function PlayerTitle({ equipped, compact = false }: PlayerTitleProps) {
    // Déclenche le chargement du catalogue et re-rend quand il arrive.
    useCatalog();

    const itemId = equipped?.title?.itemId;
    if (!itemId) return null;

    const item = getCachedItem(itemId);
    // Un titre retiré du catalogue ne s'affiche pas en cassé.
    if (!item || item.type !== 'title') return null;

    return (
        <span className={`${styles.title} ${compact ? styles.compact : ''}`}>
            {item.meta.text ?? item.meta.name}
        </span>
    );
}
