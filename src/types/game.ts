// Game-related TypeScript types

export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple';

export type GoalType = 'normal' | 'gamelle' | 'gamelle_rentrante' | 'ownGoal' | 'flash';

export type GoalPosition = 'attack' | 'defense' | 'goalkeeper' | 'midfield';

export interface Goal {
    id?: string;
    timestamp: Date;
    type: GoalType;
    position?: GoalPosition;
    scoredBy: string; // player ID
    scorerName: string;
    teamIndex: 0 | 1;
    points: number; // 1, 2, or 3
    previousMultiplier?: number;
}

export interface Team {
    players: Player[]; // Full player objects
    color: TeamColor;
    score: number;
    /**
     * Nom d'équipe. Renseigné uniquement pour les parties de tournoi, où les
     * équipes sont nommées. Absent sur une partie libre : l'équipe s'y désigne
     * par ses joueurs.
     */
    name?: string;
}

export interface Game {
    gameId: string;
    venueId: string;
    venueName: string;
    teams: [Team, Team];
    score: [number, number];
    multiplier: number; // 1, 2, or 3
    startTime: Date;
    duration: number; // seconds
    status: 'in_progress' | 'completed' | 'abandoned';
    goals: Goal[]; // Flat list of goals for timeline
    winner?: 0 | 1;
    /**
     * Instant de début. **Fait foi.**
     *
     * ⚠️ `startTime` porte exactement la même valeur : les deux sont écrits
     * ensemble depuis toujours, et les 1 020 parties de production les portent
     * toutes les deux, cohérentes (vérifié le 23/08).
     *
     * On ne supprime pas `startTime` : il faudrait migrer 1 020 documents pour
     * ne rien gagner. Mais TOUTE LECTURE passe par `gameStartMs()` dans
     * `lib/game/dates.ts`, qui sait lequel lire — plus personne n'a à choisir.
     */
    startedAt: Date;
    /**
     * La saison à laquelle cette partie appartient.
     *
     * Écrit à la création, jamais recalculé. C'est ce qui permet de filtrer le
     * profil par saison sans télécharger toutes les parties (chantier 3.8).
     *
     * Absent sur une partie antérieure au 24/08 qui n'aurait pas été reprise
     * par `scripts/backfill-seasons.mjs` — la lecture doit donc le tolérer.
     */
    seasonId?: string;
    playerIds?: string[]; // For easier querying
    hostId: string;
    sessionId?: string;
    isGuestGame?: boolean; // True if game contains guest players (won't affect stats)
    /**
     * Mode de jeu. Absent = mode normal.
     * ⚠️ Le mode ne change QUE ce qui s'affiche : une partie en mode variante
     * reste une partie normale pour les stats et l'ELO (doc 33).
     */
    modeId?: string;
    /**
     * Score à atteindre, écrit par les parties de tournoi.
     * ATTENTION : n'est LU nulle part aujourd'hui. Les parties libres ne
     * l'écrivent pas du tout, et la fin de partie est déclenchée manuellement
     * par l'hôte dans les deux cas. Champ conservé pour ne pas invalider les
     * parties de tournoi déjà enregistrées ; à unifier ou à supprimer.
     */
    /**
     * ⚠️ HÉRITÉ — plus écrit depuis le 23/08, jamais lu.
     *
     * Recopiait le `targetScore` du tournoi, lui-même vestigial. Conservé dans
     * le type uniquement parce que des parties enregistrées le portent.
     */
    gameType?: '6' | '11';
    tournamentId?: string; // If this game is part of a tournament
    tournamentMatchId?: string; // Reference to the match in the tournament
    /**
     * Packs gagnés pendant cette partie, par joueur (chantier 4.7).
     * Absent quand personne n'a franchi de palier.
     */
    packsEarned?: Record<string, number>;
    /**
     * État du chronomètre, pour les modes au temps (chantier 7.10).
     *
     * Vit sur la PARTIE et non dans chaque navigateur : c'est ce qui permet à
     * tous les appareils de calculer la même seconde, et de retrouver l'état
     * exact après un rafraîchissement.
     */
    chrono?: {
        /** Prolongations accordées. */
        extraPeriods?: number;
        /** Buts marqués quand la première prolongation a démarré. */
        goalCountAtOvertime?: number | null;
        /** Le match est en but en or : le prochain but termine tout. */
        goldenGoal?: boolean;
        /** Millisecondes cumulées passées en pause. */
        pausedTotalMs?: number;
        /** Mise en pause en cours. */
        pausedAt?: Date | null;
    };
    eloChanges?: Record<string, {
        previousElo: number;
        newElo: number;
        eloChange: number;
        username: string;
        isMVP?: boolean;
        /** Record personnel battu sur cette partie (voir la route de clôture). */
        isRecord?: boolean;
        /** Victoires consécutives après cette partie. 0 sur une défaite. */
        winStreak?: number;
    }>;
    mvpId?: string;
}

export type GameFormat = '1v1' | '2v2';

export interface Player {
    userId: string;
    username: string;
    avatarUrl?: string | null;
}

export interface GameSession {
    sessionId: string;
    hostId: string;
    hostName: string;
    venueId: string;
    venueName: string;
    format: GameFormat;
    /** Mode choisi au lancement. Recopié sur la partie au démarrage. */
    modeId?: string;
    status: 'waiting' | 'ready' | 'active' | 'finished' | 'cancelled';
    players: Player[];
    maxPlayers: number;
    pinCode: string;
    createdAt: Date;
    initiatorId: string;
    expiresAt: Date;
    gameId?: string;
}

export interface GameSetup {
    players: string[]; // 2-4 player IDs
    venueId: string;
    venueName: string;
}

export interface GameResults {
    game: Game;
    mvp: Player;
    goalsByPlayer: Record<string, number>;
    goalsByPosition: Record<GoalPosition, number>;
}
