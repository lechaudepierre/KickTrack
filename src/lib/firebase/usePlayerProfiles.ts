/**
 * Charge le strict nécessaire pour AFFICHER une liste de joueurs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUE ÇA CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 * Le lobby affichait `<RankAvatar size="md" />` **sans ELO** — donc le même
 * grade pour tout le monde — et `<PlayerBanner username={…} />` **sans
 * `bannerId` ni `equipped`**, donc l'ancienne attribution par pseudo au lieu
 * de la bannière réellement équipée.
 *
 * La cause est la même dans les deux cas : une partie ne stocke que l'identité
 * des joueurs (`userId`, `username`). Tout le reste — ELO, bannière, titre —
 * vit sur leur profil, et personne n'allait le chercher.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN HOOK PARTAGÉ
 * ═══════════════════════════════════════════════════════════════════════════
 * Trois écrans ont le même besoin : le lobby de création, le lobby rejoint, et
 * le tableau de score. Chacun a résolu le problème à sa façon, ou pas du tout.
 * Un seul point d'entrée évite qu'un quatrième écran oublie l'ELO à son tour.
 */

'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { Equipped } from '@/types/collection';

export interface PlayerProfile {
    userId: string;
    username: string;
    elo: number;
    bannerId?: string | null;
    equipped?: Equipped | null;
    /** Place au classement général. `null` tant qu'elle n'est pas connue. */
    rank?: number | null;
}

/** Un identifiant d'invité ne correspond à aucun profil. */
const estInvite = (id: string) => id.startsWith('guest_');

export function usePlayerProfiles(
    userIds: string[],
    opts: { withRank?: boolean } = {},
): Record<string, PlayerProfile> {
    const [profils, setProfils] = useState<Record<string, PlayerProfile>>({});

    // Une chaîne triée : l'effet ne se relance que si l'ENSEMBLE change, pas à
    // chaque nouveau tableau produit par le rendu parent.
    const cle = [...userIds].filter(id => id && !estInvite(id)).sort().join(',');

    useEffect(() => {
        const ids = cle ? cle.split(',') : [];
        if (ids.length === 0) return;

        let annule = false;
        const db = getFirebaseDb();

        Promise.all(ids.map(id => getDoc(doc(db, 'users', id))))
            .then(docs => {
                if (annule) return;
                const suivant: Record<string, PlayerProfile> = {};
                for (const d of docs) {
                    if (!d.exists()) continue;
                    const data = d.data();
                    suivant[d.id] = {
                        userId: d.id,
                        username: data.username ?? '',
                        elo: data.stats?.elo ?? 1000,
                        bannerId: data.bannerId ?? null,
                        equipped: (data.equipped ?? null) as Equipped | null,
                    };
                }
                setProfils(suivant);

                // La place se compte CÔTÉ SERVEUR, une requête par joueur qui
                // ne rapatrie qu'un entier. Sur un lobby de quatre, c'est
                // quatre entiers — à comparer aux 133 Ko qu'il faudrait
                // télécharger pour chercher sa ligne dans le classement.
                if (!opts.withRank) return;
                Promise.all(Object.values(suivant).map(async p => {
                    const { getPlayerRank } = await import('./games');
                    return [p.userId, await getPlayerRank(p.elo)] as const;
                })).then(places => {
                    if (annule) return;
                    setProfils(prev => {
                        const copie = { ...prev };
                        for (const [id, place] of places) {
                            if (copie[id]) copie[id] = { ...copie[id], rank: place };
                        }
                        return copie;
                    });
                }).catch(() => { /* la place est un confort, pas une étape */ });
            })
            .catch(err => console.error('[usePlayerProfiles] lecture impossible', err));

        return () => { annule = true; };
    }, [cle, opts.withRank]);

    return profils;
}
