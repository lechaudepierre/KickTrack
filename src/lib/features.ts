/**
 * DRAPEAUX DE FONCTIONNALITÉ — le système de « drop ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * À QUOI ÇA SERT
 * ═══════════════════════════════════════════════════════════════════════════
 * L'app a ~150 joueurs réels qui l'utilisent tous les jours. Une nouveauté ne
 * doit pas leur apparaître au fil des déploiements, par morceaux à moitié
 * finis. Elle doit arriver d'un coup, quand on l'a décidé.
 *
 * ⚠️ IL N'Y A QU'UN SEUL DRAPEAU, `v2`, ET UN SEUL DROP.
 *    Sacha : « à un moment on fera le switch, on dira que tout le monde a accès
 *    à la V2 maintenant. » Toutes les nouveautés visibles se cachent derrière
 *    ce drapeau et sortent ENSEMBLE — pas au fil des déploiements.
 *
 * ⚠️ CE QUI NE PASSE PAS PAR LE DRAPEAU : les corrections invisibles
 *    (race condition ELO, MVP unifié, faille de sécurité, bugs). Ce ne sont
 *    pas des fonctionnalités : elles s'appliquent à tout le monde
 *    immédiatement, parce que laisser un bug en place « jusqu'au drop »
 *    n'aurait aucun sens.
 *
 * Le drapeau a une AUDIENCE :
 *
 *   'off'       personne ne la voit. Tout le monde reste sur le comportement V1.
 *   'admins'    seuls les 3 créateurs la voient. C'est le mode de test :
 *               on l'utilise en vrai, sur les vraies données, sans que
 *               personne d'autre s'en aperçoive.
 *   'everyone'  le drop. La V2 devient la V1.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OÙ VIT LE RÉGLAGE
 * ═══════════════════════════════════════════════════════════════════════════
 * Dans Firestore, document `config/features`. Pas dans le code.
 * Faire le drop = changer un mot dans un document. **Aucun redéploiement.**
 * (Principe « les données pilotent, pas le code », doc 00.)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EN CAS DE PANNE, ON RETOMBE SUR LA V1
 * ═══════════════════════════════════════════════════════════════════════════
 * Si le document est illisible, absent, ou si le réseau tombe, toutes les
 * fonctionnalités valent `off`. Un incident ne peut donc jamais exposer une
 * nouveauté par accident — il fait juste revenir tout le monde au comportement
 * connu. C'est volontairement asymétrique.
 */

'use client';

import { doc, getDoc } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { getFirebaseDb } from '@/lib/firebase/config';
import { useAuthStore } from '@/lib/stores/authStore';
import { isAdmin } from '@/lib/utils/adminUtils';

export type FeatureAudience = 'off' | 'admins' | 'everyone';

/** Les fonctionnalités pilotables. Ajouter une clé ici puis dans le document Firestore. */
export type FeatureKey = 'v2';

export const FEATURE_KEYS: FeatureKey[] = ['v2'];

/** Description lisible, pour l'outillage admin. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
    v2: 'Toutes les nouveautés V2 (collection, personnalisation, saisons, modes de jeu…)',
};

type FeatureConfig = Record<FeatureKey, FeatureAudience>;

/** Tout est éteint tant qu'on n'a pas lu le contraire. */
const ALL_OFF: FeatureConfig = { v2: 'off' };

let cache: FeatureConfig | null = null;
let inFlight: Promise<FeatureConfig> | null = null;
const subscribers = new Set<() => void>();

function isValidAudience(value: unknown): value is FeatureAudience {
    return value === 'off' || value === 'admins' || value === 'everyone';
}

export function loadFeatures(): Promise<FeatureConfig> {
    if (cache) return Promise.resolve(cache);
    if (inFlight) return inFlight;

    inFlight = getDoc(doc(getFirebaseDb(), 'config', 'features'))
        .then(snap => {
            const raw = snap.exists() ? snap.data() : {};
            const parsed = { ...ALL_OFF };
            for (const key of FEATURE_KEYS) {
                // Une valeur inconnue ou absente vaut `off`, jamais mieux.
                if (isValidAudience(raw[key])) parsed[key] = raw[key];
            }
            cache = parsed;
            subscribers.forEach(fn => fn());
            return cache;
        })
        .catch(err => {
            console.error('[features] config illisible, repli sur V1', err);
            cache = { ...ALL_OFF };
            subscribers.forEach(fn => fn());
            return cache;
        })
        .finally(() => { inFlight = null; });

    return inFlight;
}

function subscribe(onChange: () => void): () => void {
    subscribers.add(onChange);
    if (cache === null) loadFeatures();
    return () => { subscribers.delete(onChange); };
}

const snapshot = () => cache;
const serverSnapshot = () => null;

/**
 * La fonctionnalité est-elle active pour le joueur connecté ?
 *
 * Retourne `false` tant que la config n'est pas chargée : on préfère afficher
 * brièvement la V1 puis révéler la V2, plutôt que l'inverse — un écran qui
 * disparaît sous les yeux du joueur est pire qu'un écran qui apparaît.
 */
export function useFeature(key: FeatureKey): boolean {
    const config = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const user = useAuthStore(state => state.user);

    if (!config) return false;

    switch (config[key]) {
        case 'everyone': return true;
        case 'admins':   return isAdmin(user?.email);
        default:         return false;
    }
}

/**
 * Variante pour les écrans D'AVANT CONNEXION (login, inscription).
 *
 * PROBLÈME QUE ÇA RÉSOUT : `useFeature` résout l'audience `admins` en lisant
 * l'email du joueur connecté. Sur l'écran de connexion, personne ne l'est
 * encore — la vérification ne peut donc JAMAIS passer, et une nouveauté
 * réglée sur `admins` reste invisible même pour un créateur. C'est exactement
 * ce qui est arrivé au bouton « Se connecter avec Google ».
 *
 * On ne peut pas savoir qui est devant l'écran avant qu'il se connecte. Donc,
 * avant connexion, `admins` vaut visible.
 *
 * Ce que ça expose réellement : un bouton de connexion supplémentaire. Un
 * joueur qui l'utilise soit rattache son compte existant (souhaitable), soit
 * en crée un — exactement comme l'inscription classique. Aucune fonctionnalité
 * V2 n'est accessible derrière : tout le reste passe par `useFeature`, qui
 * lui connaît le joueur.
 *
 * À n'utiliser QUE sur les écrans d'avant connexion.
 */
export function useFeaturePreAuth(key: FeatureKey): boolean {
    const config = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    if (!config) return false;
    return config[key] !== 'off';
}

/** Vide le cache — utile après un changement d'audience. */
export function invalidateFeatures(): void {
    cache = null;
}
