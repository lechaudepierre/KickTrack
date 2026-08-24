/**
 * Packs — côté client. Lecture seule, plus un appel à la route d'ouverture.
 *
 * Aucune décision ici : le client ne sait pas ce que contient un pack tant que
 * le serveur ne le lui a pas dit. C'est ce qui rend le système inattaquable
 * depuis la console du navigateur.
 */

'use client';

import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseAuth } from '@/lib/firebase/config';

export interface UnopenedPack {
    id: string;
    index: number;
}

/** Les packs non ouverts du joueur connecté, du plus ancien au plus récent. */
export async function loadMyPacks(): Promise<UnopenedPack[]> {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) return [];

    const snap = await getDocs(collection(getFirebaseDb(), 'users', uid, 'packs'));
    return snap.docs
        // Filtré ici plutôt que par une requête : sans index composite, une
        // clause `where` sur un champ absent ne renvoie rien du tout.
        .filter(d => !d.data().openedAt)
        .map(d => ({ id: d.id, index: (d.data().index as number) ?? 0 }))
        .sort((a, b) => a.index - b.index);
}

export interface OpenedPack {
    packId: string;
    itemId: string;
    duplicate: boolean;
    alreadyOpened: boolean;
}

/** Demande au serveur d'ouvrir un pack. C'est LUI qui tire. */
export async function openPackRequest(packId: string): Promise<OpenedPack> {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error('Vous devez être connecté');

    const response = await fetch('/api/packs/open', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ packId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? 'Erreur lors de l\'ouverture');
    return payload as OpenedPack;
}
