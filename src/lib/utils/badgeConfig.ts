import { BadgeId } from './statsCalculator';

export interface BadgeConfig {
    id: BadgeId;
    label: string;
    description: string;
    rule: string;
}

export const BADGE_CONFIG: Record<BadgeId, BadgeConfig> = {
    eclair: {
        id: 'eclair',
        label: 'Flasheur',
        description: 'Tu marques régulièrement des buts flash.',
        rule: 'Plus de 5% de tes buts totaux doivent être des flashs. Minimum 20 parties.',
    },
    muraille: {
        id: 'muraille',
        label: 'Muraille',
        description: 'Tu es un défenseur quasi-infranchissable.',
        rule: 'En 2v2 en tant que défenseur, tu encaisses en moyenne moins de 30% des buts possibles (par rapport au score max). Minimum 25 matchs en défense.',
    },
    buteur: {
        id: 'buteur',
        label: 'Buteur',
        description: 'Tu portes ton équipe offensivement.',
        rule: 'Tu marques en moyenne plus de 50% des buts de ton équipe. Minimum 20 parties.',
    },
    gamelleur: {
        id: 'gamelleur',
        label: 'Gamelleur',
        description: 'Tu infliges des gamelles sans complexe.',
        rule: 'Plus de 10% de tes parties contiennent au moins une gamelle de ta part. Minimum 20 parties.',
    },
    patron: {
        id: 'patron',
        label: 'Patron',
        description: 'Tu domines le classement sur le long terme.',
        rule: 'Ton taux de victoire global dépasse 65%. Minimum 30 parties.',
    },
    en_feu: {
        id: 'en_feu',
        label: 'En feu',
        description: 'Tu es sur une série de victoires impressionnante.',
        rule: 'Tu es actuellement sur une série de 5 victoires consécutives ou plus.',
    },
    mvp: {
        id: 'mvp',
        label: 'MVP',
        description: 'Tu es régulièrement le meilleur joueur en jeu.',
        rule: 'Tu es désigné MVP dans au moins 30% de tes parties. Minimum 20 parties.',
    },
};
