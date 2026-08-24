/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE FICHIER DE SAISON — tout ce qui se passe à la clôture est décrit ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier est le SEUL endroit à lire et à modifier pour clôturer une saison
 * et en ouvrir une nouvelle. Le script d'exécution ne décide rien : il applique
 * ce qu'il trouve ici.
 *
 *
 * ───────────────────────────────────────────────────────────────────────────
 * MODE D'EMPLOI, ÉTAPE PAR ÉTAPE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AVANT DE COMMENCER
 *   • il faut `serviceAccountKey.json` à la racine du projet (demander à Sacha,
 *     ce fichier n'est jamais dans Git) ;
 *   • prévenir les joueurs AVANT, avec une annonce : leur ELO va baisser, et
 *     sans explication ils croiront à un bug.
 *
 * 1. RELIRE CE FICHIER EN ENTIER
 *    Vérifier surtout `from`, `to`, et que les identifiants d'items existent
 *    bien au catalogue (`npm run check:catalog` les liste).
 *
 * 2. CONTRÔLE À BLANC — rien n'est écrit
 *
 *       npm run season:close
 *
 *    Le script affiche : le classement final, qui reçoit quoi, les packs
 *    d'ouverture, et l'ELO de chaque joueur avant et après. LIRE CE RAPPORT EN
 *    ENTIER. C'est le seul moment où une erreur ne coûte rien.
 *
 *    S'il manque un item au catalogue, le script REFUSE de démarrer. C'est
 *    voulu : une clôture qui s'arrête au milieu laisse la moitié des joueurs
 *    récompensés et l'autre non.
 *
 * 3. EXÉCUTION
 *
 *       npm run season:close -- --apply
 *
 *    Le script redemande confirmation et attend qu'on tape exactement la
 *    phrase définie plus bas (`confirmation`). Toute autre saisie annule, sans
 *    rien écrire.
 *
 *    ⚠️ La commande EXIGE un vrai terminal interactif. Lancée par un script,
 *    un agent, un cron ou une intégration continue, elle refuse de démarrer.
 *    C'est une protection volontaire : la clôture se déclenche à la main, par
 *    une personne, ou pas du tout.
 *
 * 4. APRÈS
 *    Publier les annonces depuis /admin/announcements :
 *      • « la saison est terminée » — le podium, où voir ses récompenses ;
 *      • « la nouvelle saison commence » — la compression d'ELO expliquée, et
 *        les parties de placement ;
 *      • les nouveautés, s'il y en a.
 *
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EN CAS D'ERREUR
 * ───────────────────────────────────────────────────────────────────────────
 *
 * DEUX commandes, et il faut choisir la bonne.
 *
 * ANNULER TOUT, ELO COMPRIS — c'est celle qu'on veut presque toujours :
 *
 *       npm run season:rollback season_0 -- --apply
 *
 *    Elle défait la clôture entière : récompenses, packs d'ouverture, ELO,
 *    compteurs, archives, instantané du classement, et rouvre la saison.
 *
 *    ⚠️ Elle REFUSE de s'exécuter si une partie a été jouée depuis la clôture.
 *    C'est voulu : restaurer les anciens ELO effacerait des résultats
 *    légitimes. Passé ce point, le retour arrière n'est plus la bonne
 *    opération — il faut d'abord décider quoi faire de ces parties.
 *
 * N'ANNULER QUE LES RÉCOMPENSES, en gardant l'ELO comprimé :
 *
 *       npm run season:revoke season_0_close -- --apply
 *
 *    Utile seulement si on s'est trompé de table de récompenses et qu'on veut
 *    redistribuer sans tout rejouer.
 *
 *
 * ───────────────────────────────────────────────────────────────────────────
 * POUR LA SAISON SUIVANTE
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Modifier dans ce fichier : `from`, `to`, les identifiants d'items de la
 * nouvelle saison, et `confirmation`. Rien d'autre. Aucune ligne de code de
 * l'application n'a besoin de changer.
 */

export const SEASON = {

    // ─── QUELLE SAISON SE TERMINE, LAQUELLE COMMENCE ─────────────────────────
    from: { id: 'season_0', label: 'Saison 0' },
    to: { id: 'season_1', label: 'Saison 1' },

    // ─── CE QU'ON FAIT DE L'ELO ──────────────────────────────────────────────
    //
    //   compress : nouvel ELO = 1000 + (ancien − 1000) × k
    //              L'ORDRE du classement est conservé, les ÉCARTS divisés.
    //              Avec k = 0,5 : 1350 -> 1175, 850 -> 925.
    //   reset    : tout le monde à 1000. Efface six mois de progression.
    //   keep     : on ne touche à rien. La saison 1 démarre avec les écarts
    //              déjà creusés de la saison 0.
    //
    elo: { mode: 'compress', k: 0.5 },

    // ─── PARTIES DE PLACEMENT ────────────────────────────────────────────────
    //
    // Au début de la nouvelle saison, tant qu'un joueur n'a pas joué ce nombre
    // de parties CLASSÉES :
    //   • son ELO bouge deux fois plus fort, pour trouver son niveau vite ;
    //   • sa place au classement affiche « 1 / 3 » ;
    //   • son ELO n'est pas affiché — il ne veut pas encore dire grand-chose.
    //
    // Un joueur qui a joué la saison précédente RESTE visible au classement
    // pendant son placement. Sans ça, le classement paraîtrait vide le jour du
    // lancement, et on croirait que tout le monde est parti.
    //
    placementGames: 3,

    // ─── QUI REÇOIT QUOI ─────────────────────────────────────────────────────
    recompenses: {

        // Donné à tout joueur ayant joué AU MOINS UNE partie classée.
        participation: ['pionnier_s0'],

        // Donné selon le MEILLEUR GRADE ATTEINT pendant la saison — pas celui
        // de fin. Quelqu'un qui monte Master puis redescend garde son Master.
        parGrade: {
            argent: ['grade_argent_s0', 'titre_argent_s0'],
            or: ['grade_or_s0', 'titre_or_s0'],
            diamant: ['grade_diamant_s0', 'titre_diamant_s0'],
            master: ['grade_master_s0', 'titre_master_s0'],
            grandmaster: ['grade_grandmaster_s0', 'titre_grandmaster_s0'],
        },

        // `true` : on reçoit AUSSI les items des grades inférieurs au sien.
        // Un Master repart donc avec Argent, Or, Diamant et Master — mais
        // jamais Grand Master.
        grades_cumulatifs: true,

        // Donné selon la PLACE FINALE au classement, bornes incluses.
        // Les tranches ne doivent pas se chevaucher : le premier ne reçoit que
        // « Champion », pas « Podium ».
        parPlace: [
            { min: 1, max: 1, items: ['champion_s0'] },
            { min: 2, max: 3, items: ['podium_s0'] },
        ],
    },

    // ─── LES PACKS D'OUVERTURE DE SAISON ─────────────────────────────────────
    //
    // Décision de Sacha, 24/08 : « au début de saison on donnera un pack à tout
    // le monde, deux packs pour ceux qui ont été master, trois packs pour ceux
    // qui ont été grand master ».
    //
    // C'est un cadeau de BIENVENUE dans la nouvelle saison, pas une récompense
    // de l'ancienne : il se donne à l'ouverture, avec l'ELO déjà remis à plat.
    // Le grade qui compte reste le MEILLEUR ATTEINT dans la saison qui ferme —
    // c'est la seule trace qu'il en reste une fois l'ELO comprimé.
    //
    // Le nombre n'est PAS cumulatif, contrairement aux items : un Grand Master
    // reçoit trois packs, pas 1 + 2 + 3. On prend le plus haut palier atteint.
    //
    // Mettre `0` ou retirer la clé désactive complètement le cadeau.
    //
    packsDOuverture: {
        // Pour quiconque a joué au moins une partie classée.
        tous: 1,
        // Par grade maximum atteint. Le plus haut palier l'emporte.
        parGrade: {
            master: 2,
            grandmaster: 3,
        },
    },

    // ─── LA PHRASE À TAPER POUR EXÉCUTER ─────────────────────────────────────
    //
    // Le script la demande avant d'écrire quoi que ce soit. Elle contient
    // l'identifiant de la saison : impossible de clôturer la mauvaise par
    // distraction, ni de relancer la même deux fois sans s'en rendre compte.
    //
    confirmation: 'CLOTURER-SAISON-0',
};
