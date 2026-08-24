/**
 * LES FORMATS DE TOURNOI — qui joue contre qui, et dans quel ordre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE — chantier 9.3
 * ═══════════════════════════════════════════════════════════════════════════
 * Ces trois fonctions vivaient au milieu de `firebase/tournaments.ts`, entre
 * deux appels Firestore. Elles ne touchent pourtant à aucune base : elles
 * prennent des équipes et rendent un calendrier.
 *
 * Enfermées là, elles étaient intestables — et ce sont elles qui décident du
 * déroulé d'un tournoi. Une erreur d'index dans le round-robin ne se voit pas
 * en relisant le code : elle se voit quand deux équipes se rencontrent deux
 * fois un soir de tournoi, et il est alors trop tard.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE HASARD EST INJECTÉ
 * ═══════════════════════════════════════════════════════════════════════════
 * Le tirage et les identifiants passent par `opts.alea` et `opts.nouvelId`.
 * En production ce sont `Math.random` et le générateur habituel ; dans les
 * tests, des suites déterministes. Sans ça, aucune de ces fonctions n'est
 * vérifiable deux fois de suite.
 *
 * Module pur : aucun accès Firestore.
 */

import type {
    BracketRound,
    TournamentMatch,
    TournamentStanding,
    TournamentTeam,
} from '@/types/tournament';

/** L'identifiant court utilisé pour les matchs et les équipes. */
export function nouvelIdParDefaut(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export interface OptionsDeFormat {
    /** Source de hasard, dans [0, 1[. Par défaut `Math.random`. */
    alea?: () => number;
    /** Fabrique d'identifiants de match. Par défaut `nouvelIdParDefaut`. */
    nouvelId?: () => string;
}

/** L'équipe fictive qui bouche un trou de calendrier. */
const EQUIPE_EXEMPTE: TournamentTeam = { teamId: 'BYE', name: 'BYE', players: [] };

/** L'adversaire absent d'un match d'exemption, et l'équipe encore inconnue. */
const PLACE_VIDE: TournamentTeam = { teamId: '', name: '-', players: [] };
const A_DETERMINER: TournamentTeam = { teamId: '', name: 'TBD', players: [] };

/**
 * Mélange une liste, sans la modifier.
 *
 * Fisher-Yates. Extrait parce qu'il était recopié à l'identique dans les deux
 * générateurs.
 */
export function melanger<T>(liste: readonly T[], alea: () => number = Math.random): T[] {
    const copie = [...liste];
    for (let i = copie.length - 1; i > 0; i--) {
        const j = Math.floor(alea() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
}

/**
 * CHAMPIONNAT — chaque équipe rencontre toutes les autres, une fois.
 *
 * Méthode du cercle : une équipe reste fixe, les autres tournent autour. Elle
 * garantit qu'aucune équipe ne joue deux matchs d'affilée dans un même tour.
 *
 * Nombre impair d'équipes : une exemption tourne avec les autres, et les matchs
 * qui la concernent sont simplement retirés. Chaque équipe se repose donc une
 * fois, jamais deux.
 */
export function genererMatchsRoundRobin(
    teams: readonly TournamentTeam[],
    opts: OptionsDeFormat = {},
): TournamentMatch[] {
    const alea = opts.alea ?? Math.random;
    const nouvelId = opts.nouvelId ?? nouvelIdParDefaut;

    // Le tirage décide des positions sur le cercle : c'est lui, et lui seul,
    // qui rend deux tournois différents avec les mêmes équipes.
    const melangees = melanger(teams, alea);
    const liste = melangees.length % 2 !== 0 ? [...melangees, EQUIPE_EXEMPTE] : melangees;

    const nb = liste.length;
    if (nb < 2) return [];

    const nbTours = nb - 1;
    const matchsParTour = nb / 2;
    const tours: TournamentMatch[][] = [];

    for (let tour = 0; tour < nbTours; tour++) {
        const matchsDuTour: TournamentMatch[] = [];

        for (let position = 0; position < matchsParTour; position++) {
            let domicile: number;
            let exterieur: number;

            if (position === 0) {
                // L'équipe d'indice 0 ne bouge jamais : c'est le pivot.
                domicile = 0;
                exterieur = nb - 1 - tour;
                if (exterieur === 0) exterieur = nb - 1;
            } else {
                domicile = ((nb - 1 - tour) + position) % (nb - 1);
                if (domicile === 0) domicile = nb - 1;
                exterieur = ((nb - 1 - tour) - position + (nb - 1)) % (nb - 1);
                if (exterieur === 0) exterieur = nb - 1;
            }

            if (domicile > exterieur) {
                [domicile, exterieur] = [exterieur, domicile];
            }

            const equipe1 = liste[domicile];
            const equipe2 = liste[exterieur];

            if (equipe1.teamId !== 'BYE' && equipe2.teamId !== 'BYE') {
                matchsDuTour.push({
                    matchId: nouvelId(),
                    team1: equipe1,
                    team2: equipe2,
                    status: 'pending',
                });
            }
        }

        tours.push(matchsDuTour);
    }

    // L'ordre des tours est mélangé aussi : sinon le premier tour d'un
    // tournoi à N équipes est toujours le même appariement de cercle.
    return melanger(tours, alea).flat();
}

/** Le nom d'un tour, compté depuis la finale. */
export function nomDeTour(numeroDeTour: number, nombreDeTours: number): string {
    switch (nombreDeTours - numeroDeTour) {
        case 0: return 'Finale';
        case 1: return 'Demi-finales';
        case 2: return 'Quarts de finale';
        case 3: return 'Huitiemes de finale';
        default: return `Tour ${numeroDeTour}`;
    }
}

/**
 * TABLEAU À ÉLIMINATION — l'arbre complet, du premier tour à la finale.
 *
 * Le tableau est rempli à la puissance de deux supérieure ; les places qui
 * manquent deviennent des exemptions, réparties régulièrement plutôt que
 * groupées au début — une exemption est un avantage, autant l'étaler.
 *
 * Les tours suivants sont créés vides (`TBD`), sauf les équipes exemptées qui
 * y sont déjà placées : elles n'ont pas de match à gagner pour y être.
 */
export function genererTableau(
    teams: readonly TournamentTeam[],
    opts: OptionsDeFormat = {},
): BracketRound[] {
    const alea = opts.alea ?? Math.random;
    const nouvelId = opts.nouvelId ?? nouvelIdParDefaut;

    const nb = teams.length;
    if (nb < 2) return [];

    let taille = 1;
    while (taille < nb) taille *= 2;

    const nbExemptions = taille - nb;
    const melangees = melanger(teams, alea);

    let nombreDeTours = 0;
    for (let reste = taille; reste > 1; reste /= 2) nombreDeTours++;

    const tours: BracketRound[] = [];
    const matchsPremierTour: TournamentMatch[] = [];
    const totalPremierTour = taille / 2;

    // Les positions exemptées, étalées sur la largeur du tableau.
    const positionsExemptees = new Set<number>();
    if (nbExemptions > 0) {
        const espacement = totalPremierTour / nbExemptions;
        for (let i = 0; i < nbExemptions; i++) {
            positionsExemptees.add(Math.floor(i * espacement));
        }
    }

    let curseur = 0;
    for (let i = 0; i < totalPremierTour; i++) {
        const exemption = (equipe: TournamentTeam): TournamentMatch => ({
            matchId: nouvelId(),
            team1: equipe,
            team2: PLACE_VIDE,
            winnerId: equipe.teamId,
            status: 'bye',
            round: 1,
            matchNumber: i + 1,
        });

        if (positionsExemptees.has(i) && curseur < melangees.length) {
            matchsPremierTour.push(exemption(melangees[curseur]));
            curseur++;
        } else if (curseur + 1 < melangees.length) {
            matchsPremierTour.push({
                matchId: nouvelId(),
                team1: melangees[curseur],
                team2: melangees[curseur + 1],
                status: 'pending',
                round: 1,
                matchNumber: i + 1,
            });
            curseur += 2;
        } else if (curseur < melangees.length) {
            // Une équipe reste seule : elle passe.
            matchsPremierTour.push(exemption(melangees[curseur]));
            curseur++;
        }
    }

    tours.push({
        roundNumber: 1,
        roundName: nomDeTour(1, nombreDeTours),
        matches: matchsPremierTour,
    });

    let matchsDuTour = taille / 4;
    for (let numero = 2; numero <= nombreDeTours; numero++) {
        const matchs: TournamentMatch[] = [];
        const tourPrecedent = tours[numero - 2];

        for (let i = 0; i < matchsDuTour; i++) {
            const precedent1 = tourPrecedent.matches[i * 2];
            const precedent2 = tourPrecedent.matches[i * 2 + 1];

            matchs.push({
                matchId: nouvelId(),
                team1: precedent1?.status === 'bye' ? precedent1.team1 : A_DETERMINER,
                team2: precedent2?.status === 'bye' ? precedent2.team1 : A_DETERMINER,
                status: 'pending',
                round: numero,
                matchNumber: i + 1,
            });
        }

        tours.push({
            roundNumber: numero,
            roundName: nomDeTour(numero, nombreDeTours),
            matches: matchs,
        });
        matchsDuTour /= 2;
    }

    return tours;
}

/** Le classement de départ d'un championnat : tout le monde à zéro. */
export function classementInitial(teams: readonly TournamentTeam[]): TournamentStanding[] {
    return teams.map(team => ({
        teamId: team.teamId,
        teamName: team.name,
        players: team.players,
        played: 0,
        wins: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
    }));
}
