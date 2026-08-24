/**
 * Onglets du profil — refonte, étape 2.
 *
 * Le profil empilait onze sections ayant toutes exactement le même traitement
 * visuel : courbe d'ELO, gamelles, buts flash, rôles, métriques détaillées,
 * podium des coéquipiers, face-à-face, dernières parties. On faisait défiler
 * sans fin et rien ne ressortait.
 *
 * Les onglets ne suppriment aucune donnée. Ils cessent simplement de tout
 * imposer d'un coup.
 */

'use client';

import styles from './ProfileTabs.module.css';

export type ProfileTab = 'stats' | 'joueurs' | 'historique';

/**
 * L'ordre compte : on regarde ses chiffres, puis avec et contre qui on joue,
 * et l'historique en dernier — c'est la vue de détail, pas la vue d'entrée.
 *
 * « Avec & Contre » et non « Adversaires » : l'onglet contient le podium des
 * COÉQUIPIERS autant que le face-à-face. Le nommer par la moitié de son
 * contenu aurait caché l'autre.
 */
const TABS: { id: ProfileTab; label: string }[] = [
    { id: 'stats', label: 'Statistiques' },
    { id: 'joueurs', label: 'Avec & Contre' },
    { id: 'historique', label: 'Historique' },
];

interface ProfileTabsProps {
    active: ProfileTab;
    onChange: (tab: ProfileTab) => void;
}

export default function ProfileTabs({ active, onChange }: ProfileTabsProps) {
    return (
        <div className={styles.tabs} role="tablist">
            {TABS.map(tab => (
                <button key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.id}
                    className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
