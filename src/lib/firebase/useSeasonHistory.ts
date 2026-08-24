'use client';

/**
 * L'HISTORIQUE DE SAISON D'UN JOUEUR — chantier 3.5.
 *
 * La clôture archive, pour chaque joueur, ce qu'il a fait de la saison :
 * son rang, son ELO d'avant compression, son meilleur grade, ses parties.
 * C'est la **contrepartie visible du reset** : le joueur perd son ELO mais
 * garde une trace permanente. Sans cet affichage, le reset se vit comme une
 * punition sèche.
 *
 * Lecture seule, et volontairement tolérante : tant qu'aucune saison n'a été
 * clôturée, la liste est vide et l'interface n'affiche rien du tout.
 */

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from './config';

export interface SeasonArchive {
    seasonId: string;
    label: string;
    rank: number;
    elo: number;
    peakGrade: string;
    games: number;
    items: string[];
}

/**
 * Les saisons closes d'un joueur, la plus récente d'abord.
 *
 * `null` tant que la lecture n'a pas abouti — l'appelant distingue ainsi
 * « pas encore chargé » de « aucune saison », qui ne s'affichent pas pareil.
 */
export function useSeasonHistory(userId: string | undefined): SeasonArchive[] | null {
    /*
     * On mémorise DE QUI vient la lecture, pas seulement son résultat.
     *
     * Sans ça il faudrait remettre l'état à zéro au début de l'effet — un
     * `setState` synchrone dans un effet, que React 19 refuse à juste titre :
     * il provoque un rendu de plus à chaque passage. En gardant l'identifiant
     * à côté des données, on sait si ce qu'on tient concerne encore le joueur
     * affiché, et l'historique d'un autre ne peut pas s'afficher un instant.
     */
    const [lecture, setLecture] = useState<{ userId: string; saisons: SeasonArchive[] } | null>(null);

    useEffect(() => {
        if (!userId) return;

        let annule = false;
        getDocs(collection(getFirebaseDb(), 'users', userId, 'seasons'))
            .then(snap => {
                if (annule) return;
                const saisons = snap.docs
                    .map(d => d.data() as SeasonArchive)
                    .sort((a, b) => (b.seasonId ?? '').localeCompare(a.seasonId ?? ''));
                setLecture({ userId, saisons });
            })
            // Une lecture qui échoue — droits, réseau — vaut « aucune saison » :
            // on n'affiche rien plutôt qu'une erreur sur un bloc facultatif.
            .catch(() => { if (!annule) setLecture({ userId, saisons: [] }); });

        return () => { annule = true; };
    }, [userId]);

    return lecture && lecture.userId === userId ? lecture.saisons : null;
}
