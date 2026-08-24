import type { Equipped } from './collection';

export interface DailyStats {
    date: string; // YYYY-MM-DD
    gamesPlayed: number;
    wins: number;
    goalsScored: number;
    elo?: number; // Elo at the end of the day
}

export interface UserStats {
    /**
     * Parties qui comptent pour les packs (chantier 4.7).
     *
     * Distinct de `totalGames` : une partie contre des invités, ou écourtée
     * avant que le gagnant atteigne le seuil de buts, compte dans les
     * statistiques mais ne rapporte pas de pack.
     */
    packGames?: number;
    /**
     * Parties CLASSÉES jouées dans la saison en cours (chantier saison).
     *
     * Remis à zéro à la clôture. C'est lui qui pilote les parties de placement :
     * tant qu'il est sous le seuil, l'ELO bouge deux fois plus fort et la place
     * au classement est remplacée par « 1 / 3 ».
     */
    seasonGames?: number;
    /** Saison à laquelle `seasonGames` se rapporte. */
    seasonId?: string;
    /** Le joueur figurait-il au classement de la saison précédente ? */
    playedPreviousSeason?: boolean;
    /**
     * Compteurs par stade (chantier 9.36). Sept stades aujourd'hui : la carte
     * reste minuscule, et elle évite de relire toutes les parties d'un stade
     * pour afficher son classement.
     */
    venues?: Record<string, { games: number; wins: number; goalsScored: number }>;
    totalGames: number;
    wins: number;
    losses: number;
    goalsScored: number;
    goalsConceded: number;
    winRate: number;
    elo?: number; // Current Elo rating
    /** Pic d'ELO atteint — alimente le « grade maximum atteint » des saisons (chantier 3.1). */
    peakElo?: number;
    /** Nombre de fois désigné MVP. */
    mvpCount?: number;
    /** Victoires consécutives en cours. Remis à zéro à chaque défaite. */
    winStreak?: number;
    /**
     * ⚠️ SUPPRIMÉ EN PRODUCTION le 22/08 (D7). Plus rien ne l'écrit.
     *
     * Le champ reste déclaré parce que `resolvePeakElo` garde un repli
     * défensif dessus — inutile aujourd'hui, mais gratuit, et il protégerait
     * un profil qui aurait échappé à la purge.
     *
     * Il pesait 43 % des 141 profils que le classement télécharge, et personne
     * ne le lisait : le graphique du profil est recalculé depuis les parties,
     * et le pic d'ELO tient dans `peakElo`.
     */
    eloHistory?: { date: string, elo: number }[];
    history?: Record<string, DailyStats>; // Key is YYYY-MM-DD
}

export interface User {
    /**
     * Packs (chantier 4.7). Écrits par le serveur uniquement.
     *
     * `packsBaseline` est le nombre de parties au moment où le système a été
     * activé pour ce joueur : sans lui, l'historique compterait et les gros
     * joueurs recevraient des dizaines de packs d'un coup.
     */
    packsGranted?: number;
    packsBaseline?: number;
    /** Packs non ouverts — alimente la pastille de la barre de navigation. */
    packsUnopened?: number;

    userId: string;
    username: string;
    usernameLowercase: string;
    email?: string;
    avatarUrl?: string;
    createdAt: Date;
    stats: UserStats;
    preferences?: {
        favoriteVenue?: string;
        notifications?: boolean;
    };
    favoriteVenues?: string[]; // Array of venue IDs
    /**
     * @deprecated Migré vers `equipped.banner` (chantier 2.5).
     * Conservé le temps que le script de migration passe sur tous les profils.
     */
    bannerId?: string;
    /**
     * Cosmétiques équipés — slot → item. Volontairement sur le profil et pas
     * en sous-collection : c'est ce qu'on lit pour afficher n'importe quel
     * joueur dans un classement, donc ça doit venir avec le document user.
     * L'inventaire complet, lui, vit en sous-collection (doc 20).
     */
    equipped?: Equipped;
    friends?: string[]; // Array of userId
    friendRequestsReceived?: string[]; // Array of userId who sent requests
    friendRequestsSent?: string[]; // Array of userId to whom requests were sent
    readAnnouncementIds?: string[]; // IDs of announcements the user has opened
}

export interface FriendRequest {
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    toUsername: string;
    createdAt: Date;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface UserInput {
    username: string;
    email?: string;
    password?: string;
}
