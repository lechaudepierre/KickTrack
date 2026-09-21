import { describe, expect, it } from 'vitest';
import { cheminProtege, doitRecharger, versionDifferente } from './updateCheck';

describe('versionDifferente', () => {
    it('deux versions distinctes', () => {
        expect(versionDifferente({ chargee: 'abc', deployee: 'def' })).toBe(true);
    });

    it('la meme version ne declenche rien', () => {
        expect(versionDifferente({ chargee: 'abc', deployee: 'abc' })).toBe(false);
    });

    it('une version absente ne prouve rien', () => {
        // En developpement il n'y a pas d'identifiant de deploiement. Et une
        // reponse tronquee ne doit pas provoquer un rechargement en boucle.
        expect(versionDifferente({ chargee: undefined, deployee: 'def' })).toBe(false);
        expect(versionDifferente({ chargee: 'abc', deployee: undefined })).toBe(false);
        expect(versionDifferente({ chargee: undefined, deployee: undefined })).toBe(false);
    });

    it('une chaine vide vaut une absence', () => {
        expect(versionDifferente({ chargee: '', deployee: 'def' })).toBe(false);
    });
});

describe('cheminProtege', () => {
    it('une partie en cours est protegee', () => {
        expect(cheminProtege('/game/abc123')).toBe(true);
        expect(cheminProtege('/game/abc123/results')).toBe(true);
    });

    it('un tournoi en cours est protege', () => {
        expect(cheminProtege('/tournament/xyz/live')).toBe(true);
    });

    it('les ecrans de consultation ne le sont pas', () => {
        for (const c of ['/', '/dashboard', '/leaderboard', '/profile', '/collection', '/friends']) {
            expect(cheminProtege(c)).toBe(false);
        }
    });
});

describe('doitRecharger', () => {
    const nouvelle = { chargee: 'v1', deployee: 'v2' };

    it('nouvelle version, ecran neutre, page visible : on recharge', () => {
        expect(doitRecharger(nouvelle, '/dashboard', true)).toBe(true);
    });

    it('JAMAIS pendant un match, meme avec une nouvelle version', () => {
        // Un rechargement pendant qu'on compte les buts est pire que la
        // version perimee : on perd le fil sous les doigts du joueur.
        expect(doitRecharger(nouvelle, '/game/abc', true)).toBe(false);
    });

    it('jamais sur un onglet en arriere-plan', () => {
        // Recharger pour personne fait travailler le telephone pour rien.
        expect(doitRecharger(nouvelle, '/dashboard', false)).toBe(false);
    });

    it('jamais si la version n a pas change', () => {
        expect(doitRecharger({ chargee: 'v1', deployee: 'v1' }, '/dashboard', true)).toBe(false);
    });

    it('jamais en developpement, ou la version est absente', () => {
        expect(doitRecharger({ chargee: undefined, deployee: undefined }, '/dashboard', true)).toBe(false);
    });

    it('le joueur sort du match : la mise a jour se fait la', () => {
        // Le scenario reel : il joue, il revient au tableau de bord, et c'est
        // a ce moment que la page se recharge -- sans qu'il s'en apercoive.
        expect(doitRecharger(nouvelle, '/game/abc', true)).toBe(false);
        expect(doitRecharger(nouvelle, '/dashboard', true)).toBe(true);
    });
});
