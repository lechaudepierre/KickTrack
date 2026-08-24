import { describe, expect, it } from 'vitest';
import type { TournamentTeam } from '@/types/tournament';
import {
    classementInitial,
    genererMatchsRoundRobin,
    genererTableau,
    melanger,
    nomDeTour,
} from './format';

/** Des equipes numerotees, pour pouvoir lire les appariements a l oeil. */
const equipes = (n: number): TournamentTeam[] =>
    Array.from({ length: n }, (_, i) => ({
        teamId: `E${i + 1}`,
        name: `Equipe ${i + 1}`,
        players: [],
    }));

/**
 * Hasard neutre : l ordre d entree est conserve.
 *
 * Attention, ce n est PAS `() => 0` : dans Fisher-Yates, un tirage nul echange
 * chaque element avec le premier, ce qui melange bel et bien. Pour ne rien
 * bouger il faut j === i, donc un tirage juste sous 1.
 */
const sansMelange = () => 0.9999999;

/** Identifiants previsibles, pour que deux executions soient comparables. */
const compteur = () => {
    let n = 0;
    return () => `m${++n}`;
};

const options = () => ({ alea: sansMelange, nouvelId: compteur() });

/**
 * La paire d un match, normalisee pour que E1-E2 et E2-E1 soient identiques.
 *
 * Le tri est ALPHABETIQUE : `E10` passe avant `E2`. La liste attendue doit
 * etre construite avec la meme fonction, sinon les deux ne coincident plus
 * a partir de dix equipes -- et c est le test qui echoue, pas le calendrier.
 */
const paire = (a: string, b: string) => [a, b].sort().join(' vs ');

const paireDuMatch = (m: { team1: TournamentTeam; team2: TournamentTeam }) =>
    paire(m.team1.teamId, m.team2.teamId);

describe('melanger', () => {
    it('ne modifie pas la liste d origine', () => {
        const origine = [1, 2, 3, 4];
        melanger(origine, () => 0.5);
        expect(origine).toEqual([1, 2, 3, 4]);
    });

    it('conserve tous les elements', () => {
        const melangee = melanger([1, 2, 3, 4, 5], () => 0.7);
        expect([...melangee].sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('un tirage juste sous 1 laisse la liste en place', () => {
        expect(melanger([1, 2, 3, 4], sansMelange)).toEqual([1, 2, 3, 4]);
    });

    it('un tirage nul melange quand meme -- il echange tout avec le premier', () => {
        expect(melanger([1, 2, 3, 4], () => 0)).not.toEqual([1, 2, 3, 4]);
    });
});

describe('genererMatchsRoundRobin', () => {
    it('moins de deux equipes : aucun match', () => {
        expect(genererMatchsRoundRobin([], options())).toEqual([]);
        expect(genererMatchsRoundRobin(equipes(1), options())).toEqual([]);
    });

    // LA propriete d un championnat. Si elle tombe, deux equipes se
    // rencontrent deux fois -- ou pas du tout -- un soir de tournoi.
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16]) {
        it(`${n} equipes : chaque paire se rencontre exactement une fois`, () => {
            const matchs = genererMatchsRoundRobin(equipes(n), options());
            const rencontres = matchs.map(paireDuMatch);

            const attendues: string[] = [];
            for (let i = 1; i <= n; i++) {
                for (let j = i + 1; j <= n; j++) attendues.push(paire(`E${i}`, `E${j}`));
            }

            expect([...new Set(rencontres)].sort()).toEqual(attendues.sort());
            expect(rencontres).toHaveLength(attendues.length);
        });
    }

    it('aucune equipe ne se rencontre elle-meme', () => {
        for (const n of [3, 5, 8, 11]) {
            for (const m of genererMatchsRoundRobin(equipes(n), options())) {
                expect(m.team1.teamId).not.toBe(m.team2.teamId);
            }
        }
    });

    it('aucune equipe fictive ne subsiste dans le calendrier', () => {
        for (const n of [3, 5, 7, 9]) {
            for (const m of genererMatchsRoundRobin(equipes(n), options())) {
                expect(m.team1.teamId).not.toBe('BYE');
                expect(m.team2.teamId).not.toBe('BYE');
            }
        }
    });

    it('tous les matchs sont en attente et portent un identifiant unique', () => {
        const matchs = genererMatchsRoundRobin(equipes(6), options());
        expect(matchs.every(m => m.status === 'pending')).toBe(true);
        expect(new Set(matchs.map(m => m.matchId)).size).toBe(matchs.length);
    });

    it('le tirage change l ordre, pas le contenu', () => {
        const sansTirage = genererMatchsRoundRobin(equipes(6), options());
        const avecTirage = genererMatchsRoundRobin(equipes(6), {
            alea: () => 0.9,
            nouvelId: compteur(),
        });
        expect([...new Set(avecTirage.map(paireDuMatch))].sort())
            .toEqual([...new Set(sansTirage.map(paireDuMatch))].sort());
    });
});

describe('nomDeTour', () => {
    it('nomme les tours depuis la finale', () => {
        expect(nomDeTour(3, 3)).toBe('Finale');
        expect(nomDeTour(2, 3)).toBe('Demi-finales');
        expect(nomDeTour(1, 3)).toBe('Quarts de finale');
        expect(nomDeTour(1, 5)).toBe('Tour 1');
    });

    it('un tournoi a deux equipes n a qu une finale', () => {
        expect(nomDeTour(1, 1)).toBe('Finale');
    });
});

describe('genererTableau', () => {
    it('moins de deux equipes : aucun tour', () => {
        expect(genererTableau([], options())).toEqual([]);
        expect(genererTableau(equipes(1), options())).toEqual([]);
    });

    for (const [n, toursAttendus] of [[2, 1], [3, 2], [4, 2], [5, 3], [8, 3], [9, 4], [16, 4]] as const) {
        it(`${n} equipes : ${toursAttendus} tour(s), et une seule finale`, () => {
            const tours = genererTableau(equipes(n), options());
            expect(tours).toHaveLength(toursAttendus);
            expect(tours[tours.length - 1].roundName).toBe('Finale');
            expect(tours[tours.length - 1].matches).toHaveLength(1);
        });
    }

    for (const n of [2, 3, 4, 5, 6, 7, 8, 11, 16]) {
        it(`${n} equipes : chacune entre dans le tableau une fois et une seule`, () => {
            const premierTour = genererTableau(equipes(n), options())[0];
            const engagees = premierTour.matches.flatMap(m =>
                [m.team1, m.team2].filter(t => t.teamId !== '').map(t => t.teamId),
            );
            expect([...engagees].sort()).toEqual(equipes(n).map(t => t.teamId).sort());
        });
    }

    it('chaque tour a deux fois moins de matchs que le precedent', () => {
        const tours = genererTableau(equipes(16), options());
        expect(tours.map(t => t.matches.length)).toEqual([8, 4, 2, 1]);
    });

    it('une exemption est deja gagnee et sans adversaire', () => {
        const exemptions = genererTableau(equipes(5), options())[0]
            .matches.filter(m => m.status === 'bye');
        expect(exemptions.length).toBeGreaterThan(0);
        for (const m of exemptions) {
            expect(m.winnerId).toBe(m.team1.teamId);
            expect(m.team2.teamId).toBe('');
        }
    });

    it('les exemptions se suivent en debut de tableau -- comportement actuel', () => {
        // ⚠️ Le code d origine annonce « distribute byes evenly across the
        // bracket for fairness », mais l espacement vaut places/exemptions,
        // et floor(i * 4/3) donne 0, 1, 2 : elles sont CONTIGUES.
        //
        // Ce test fige ce que fait le code aujourd hui, il ne l approuve pas.
        // Corriger la repartition changerait la forme des tableaux : c est une
        // decision de jeu, pas de refactoring. Signale a Sacha.
        const positions = genererTableau(equipes(5), options())[0]
            .matches.map((m, i) => (m.status === 'bye' ? i : -1))
            .filter(i => i >= 0);
        expect(positions).toEqual([0, 1, 2]);
    });

    it('une equipe exemptee est deja placee au tour suivant', () => {
        const tours = genererTableau(equipes(5), options());
        const exemptee = tours[0].matches.find(m => m.status === 'bye')!.team1.teamId;
        const placees = tours[1].matches.flatMap(m => [m.team1.teamId, m.team2.teamId]);
        expect(placees).toContain(exemptee);
    });

    it('les places encore a jouer sont marquees TBD', () => {
        const tours = genererTableau(equipes(8), options());
        expect(tours[1].matches.every(m => m.team1.name === 'TBD' && m.team2.name === 'TBD')).toBe(true);
    });

    it('tous les identifiants de match sont uniques', () => {
        const ids = genererTableau(equipes(11), options()).flatMap(t => t.matches.map(m => m.matchId));
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('classementInitial', () => {
    it('met tout le monde a zero', () => {
        expect(classementInitial(equipes(2))[0]).toEqual({
            teamId: 'E1',
            teamName: 'Equipe 1',
            players: [],
            played: 0,
            wins: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0,
        });
    });

    it('garde une ligne par equipe, dans l ordre', () => {
        expect(classementInitial(equipes(5)).map(c => c.teamId)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5']);
    });
});
