import { describe, it, expect } from 'vitest';
import {
    readLadder,
    appearsInLadder,
    applyGameToLadder,
    orderedLadders,
    isLadderId,
    LADDERS,
    ELO_BASE,
    type StatsLike,
} from './ladders';
import { NORMAL_MODE, BLITZ_MODE, BIBITIF_MODE, CHRONO_MODE } from '@/lib/gamemodes/modes';

describe('le registre', () => {
    it('le classement de référence est le général', () => {
        expect(LADDERS.normal.primary).toBe(true);
        expect(LADDERS.blitz.primary).toBe(false);
    });

    it('le principal s\'affiche en premier', () => {
        expect(orderedLadders().map(l => l.id)).toEqual(['normal', 'blitz']);
    });

    it('reconnaît un identifiant valide', () => {
        expect(isLadderId('blitz')).toBe(true);
        expect(isLadderId('normal')).toBe(true);
        expect(isLadderId('chrono')).toBe(false);
        expect(isLadderId(undefined)).toBe(false);
    });
});

describe('quel mode alimente quel classement', () => {
    it('Normal alimente le classement général et rapporte des packs', () => {
        expect(NORMAL_MODE.ladder).toBe('normal');
        expect(NORMAL_MODE.rewards).toBe(true);
    });

    it('Blitz a SON classement, et rapporte des packs depuis le 23/08', () => {
        expect(BLITZ_MODE.ladder).toBe('blitz');
        expect(BLITZ_MODE.rewards).toBe(true);
    });

    it('Bibitif et Chrono n\'alimentent aucun classement', () => {
        expect(BIBITIF_MODE.ladder).toBeUndefined();
        expect(CHRONO_MODE.ladder).toBeUndefined();
    });
});

describe('readLadder — le classement principal EST les champs historiques', () => {
    const ancien: StatsLike = { elo: 1215, peakElo: 1260, totalGames: 40, wins: 25 };

    it('le classement général se lit directement dans les champs historiques', () => {
        // Aucune copie, donc aucune migration et aucune divergence possible
        // entre deux sources de vérité.
        expect(readLadder(ancien, 'normal')).toEqual({
            elo: 1215, peakElo: 1260, games: 40, wins: 25,
        });
    });

    it('une copie parasite dans `ladders.normal` est IGNORÉE', () => {
        // Le principal ne se lit qu'à un seul endroit. Si une vieille donnée
        // traînait, elle ne doit pas prendre le dessus.
        const parasite: StatsLike = { ...ancien, ladders: { normal: { elo: 9999, games: 1, wins: 1 } } };
        expect(readLadder(parasite, 'normal').elo).toBe(1215);
    });

    it('une échelle ne porte AUCUN historique — D7, 22/08', () => {
        // `stats.eloHistory` a été supprimé : il pesait 43 % des profils que
        // le classement télécharge, et le pic tient dans un seul nombre.
        expect(readLadder(ancien, 'normal')).not.toHaveProperty('eloHistory');
    });

    it('un profil sans rien du tout part de la base', () => {
        expect(readLadder(undefined, 'normal').elo).toBe(ELO_BASE);
    });

    it('le pic vaut au moins l\'ELO courant', () => {
        expect(readLadder({ elo: 1400 }, 'normal').peakElo).toBe(1400);
        expect(readLadder({ ladders: { blitz: { elo: 1150 } } }, 'blitz').peakElo).toBe(1150);
    });
});

describe('readLadder — le Blitz ne retombe JAMAIS sur les champs historiques', () => {
    const joueur: StatsLike = { elo: 1400, totalGames: 200, wins: 150 };

    it('un gros joueur du mode Normal démarre à zéro en Blitz', () => {
        expect(readLadder(joueur, 'blitz')).toEqual({
            elo: ELO_BASE, peakElo: ELO_BASE, games: 0, wins: 0,
        });
    });

    it('et il n\'apparaît donc pas dans le classement Blitz', () => {
        // Décision de Sacha, 22/08 : « un joueur qui n'a jamais joué en Blitz,
        // il n'apparaît juste pas ».
        expect(appearsInLadder(joueur, 'blitz')).toBe(false);
        expect(appearsInLadder(joueur, 'normal')).toBe(true);
    });

    it('une seule partie suffit à y entrer', () => {
        expect(appearsInLadder({ ladders: { blitz: { games: 1 } } }, 'blitz')).toBe(true);
    });

    it('un joueur sans aucune partie n\'apparaît nulle part', () => {
        expect(appearsInLadder({ elo: 1000 }, 'normal')).toBe(false);
        expect(appearsInLadder({ elo: 1000 }, 'blitz')).toBe(false);
    });
});

describe('applyGameToLadder', () => {
    const depart = { elo: 1200, peakElo: 1250, games: 10, wins: 6 };

    it('une victoire monte l\'ELO et le compteur', () => {
        const apres = applyGameToLadder(depart, { eloChange: 15, won: true });
        expect(apres.elo).toBe(1215);
        expect(apres.games).toBe(11);
        expect(apres.wins).toBe(7);
    });

    it('une défaite compte une partie mais pas de victoire', () => {
        const apres = applyGameToLadder(depart, { eloChange: -12, won: false });
        expect(apres.elo).toBe(1188);
        expect(apres.wins).toBe(6);
    });

    it('le pic ne redescend jamais', () => {
        const apres = applyGameToLadder(depart, { eloChange: -50, won: false });
        expect(apres.peakElo).toBe(1250);
    });

    it('mais il monte quand on le dépasse', () => {
        const apres = applyGameToLadder(depart, { eloChange: 80, won: true });
        expect(apres.peakElo).toBe(1280);
    });



    it('ne mute jamais l\'état de départ', () => {
        applyGameToLadder(depart, { eloChange: 15, won: true });
        expect(depart.elo).toBe(1200);
        expect(depart.games).toBe(10);
    });

    it('deux parties d\'affilée s\'enchaînent correctement', () => {
        const a = applyGameToLadder(depart, { eloChange: 15, won: true });
        const b = applyGameToLadder(a, { eloChange: -5, won: false });
        expect(b.elo).toBe(1210);
        expect(b.games).toBe(12);
        expect(b.wins).toBe(7);
    });
});

describe('la matrice des modes, telle que Sacha l\'a tranchée le 22/08', () => {
    const attendu = [
        { mode: NORMAL_MODE, ladder: 'normal', rewards: true, stats: true },
        // Le bibitif est le SEUL mode qui ne compte nulle part : c'est un mode
        // de fête, il ne doit déformer les chiffres de personne.
        { mode: BIBITIF_MODE, ladder: undefined, rewards: false, stats: false },
        { mode: CHRONO_MODE, ladder: undefined, rewards: true, stats: false },
        // Le Blitz compte dans les stats ET a son classement. Seuls les packs
        // lui échappent : deux minutes de jeu ne doivent pas devenir le moyen
        // le plus rapide d'en farmer.
        { mode: BLITZ_MODE, ladder: 'blitz', rewards: true, stats: true },
    ];

    for (const cas of attendu) {
        it(`${cas.mode.name} : classement ${cas.ladder ?? 'aucun'}, packs ${cas.rewards ? 'oui' : 'non'}, stats ${cas.stats ? 'oui' : 'non'}`, () => {
            expect(cas.mode.ladder).toBe(cas.ladder);
            expect(cas.mode.rewards).toBe(cas.rewards);
            expect(cas.mode.countsInStats).toBe(cas.stats);
        });
    }

    it('trois modes sur quatre rapportent des packs — seul le bibitif est exclu', () => {
        expect(attendu.filter(c => c.mode.rewards).map(c => c.mode.id).sort())
            .toEqual(['blitz', 'chrono', 'normal']);
    });

    it('le bibitif est le seul mode qui ne compte nulle part', () => {
        const nulle = attendu.filter(c => !c.mode.ladder && !c.mode.rewards && !c.mode.countsInStats);
        expect(nulle.map(c => c.mode.id)).toEqual(['bibitif']);
    });

});

describe('la matrice mise à jour le 23/08', () => {
    it('le Blitz rapporte désormais des packs', () => {
        expect(BLITZ_MODE.rewards).toBe(true);
    });

    it('le Chrono aussi, bien qu\'il ne compte nulle part ailleurs', () => {
        expect(CHRONO_MODE.rewards).toBe(true);
        expect(CHRONO_MODE.ladder).toBeUndefined();
        expect(CHRONO_MODE.countsInStats).toBe(false);
    });

    it('le bibitif reste le seul mode qui ne rapporte RIEN', () => {
        expect(BIBITIF_MODE.rewards).toBe(false);
        expect(BIBITIF_MODE.ladder).toBeUndefined();
        expect(BIBITIF_MODE.countsInStats).toBe(false);
    });
});
