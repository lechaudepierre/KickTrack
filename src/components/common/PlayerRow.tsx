/**
 * LA LIGNE D'UN JOUEUR — le composant partagé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL N'EXISTAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 * Sacha : « pourquoi le lobby n'utilise pas exactement le même composant que
 * dans le classement ? » Réponse honnête : **parce qu'il n'y en avait pas**.
 * `PlayerBanner` ne donne que la FORME — la boîte, le ratio, le fond. Ce qu'on
 * met dedans était réécrit à la main dans chaque écran, et chacun oubliait
 * quelque chose : l'ELO ici, le titre là, le grade ailleurs.
 *
 * Ce composant porte le CONTENU : avatar de son grade, pseudo, titre, ELO, et
 * la place au classement. Un écran qui l'utilise ne peut plus rien oublier.
 *
 * Le classement lui-même garde sa mise en page en colonnes (rang, victoires,
 * ELO) : c'est un tableau, pas une liste de cartes. Les deux partagent la
 * forme et les données, pas la disposition.
 */

'use client';

import PlayerBanner from './PlayerBanner';
import PlayerTitle from './PlayerTitle';
import RankAvatar from './RankAvatar';
import { resolveBanner } from '@/lib/collection/banner';
import type { Equipped } from '@/types/collection';
import styles from './PlayerRow.module.css';

export interface PlayerRowProfile {
    username?: string;
    elo?: number;
    bannerId?: string | null;
    equipped?: Equipped | null;
    rank?: number | null;
}

interface PlayerRowProps {
    username: string;
    profile?: PlayerRowProfile;
    /** `large` grossit le pseudo : utilisé en match, où on lit de loin. */
    size?: 'normal' | 'large';
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
    /** Contenu ajouté à droite (croix d'exclusion, coche…). */
    trailing?: React.ReactNode;
}

export default function PlayerRow({
    username,
    profile,
    size = 'normal',
    className,
    style,
    onClick,
    trailing,
}: PlayerRowProps) {
    const surBanniere = !!resolveBanner(username, profile?.bannerId, profile?.equipped);

    return (
        <PlayerBanner username={username}
            bannerId={profile?.bannerId}
            equipped={profile?.equipped}
            className={`${styles.row} ${className ?? ''}`}
            style={style}
            onClick={onClick}
        >
            <RankAvatar size={size === 'large' ? 'lg' : 'md'} elo={profile?.elo} />

            <div className={styles.info}>
                <span className={[
                    styles.name,
                    size === 'large' ? styles.nameLarge : '',
                    surBanniere ? styles.onBanner : '',
                ].filter(Boolean).join(' ')}>
                    {username}
                </span>

                <PlayerTitle equipped={profile?.equipped} compact />

                {profile?.elo !== undefined && (
                    <span className={`${styles.elo} ${surBanniere ? styles.onBanner : ''}`}>
                        {/* La place d'abord : c'est ce qu'on cherche en premier
                            quand on regarde quelqu'un. */}
                        {profile.rank != null && (
                            <span className={styles.rank}>#{profile.rank}</span>
                        )}
                        {profile.elo} Elo
                    </span>
                )}
            </div>

            {trailing}
        </PlayerBanner>
    );
}
