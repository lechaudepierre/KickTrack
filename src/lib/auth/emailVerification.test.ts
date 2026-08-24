import { describe, it, expect } from 'vitest';
import {
    isPasswordAtRisk,
    shouldPromptVerification,
    snoozeUntil,
    snoozeStorageKey,
    SNOOZE_DAYS,
    type VerifiableAccount,
} from './emailVerification';

const PASSWORD = [{ providerId: 'password' }];
const GOOGLE = [{ providerId: 'google.com' }];
const BOTH = [{ providerId: 'password' }, { providerId: 'google.com' }];

const account = (o: Partial<VerifiableAccount> = {}): VerifiableAccount => ({
    email: 'joueur@hotmail.com',
    emailVerified: false,
    providerData: PASSWORD,
    ...o,
});

describe('isPasswordAtRisk', () => {
    it('le cas de 140 comptes sur 143 : mot de passe, adresse non vérifiée', () => {
        expect(isPasswordAtRisk(account())).toBe(true);
    });

    it('adresse vérifiée : lier Google ne supprime plus rien', () => {
        expect(isPasswordAtRisk(account({ emailVerified: true }))).toBe(false);
    });

    it('compte Google seul : aucun mot de passe à perdre', () => {
        expect(isPasswordAtRisk(account({ providerData: GOOGLE, emailVerified: true }))).toBe(false);
    });

    it('compte Google non vérifié et sans mot de passe : rien à protéger', () => {
        expect(isPasswordAtRisk(account({ providerData: GOOGLE }))).toBe(false);
    });

    it('les deux fournisseurs mais adresse non vérifiée : encore à risque', () => {
        expect(isPasswordAtRisk(account({ providerData: BOTH }))).toBe(true);
    });

    it('compte anonyme, sans adresse', () => {
        expect(isPasswordAtRisk(account({ email: null, providerData: [] }))).toBe(false);
    });

    it('personne connecté', () => {
        expect(isPasswordAtRisk(null)).toBe(false);
    });
});

describe('shouldPromptVerification', () => {
    const NOW = 1_700_000_000_000;

    it('jamais écarté : on propose', () => {
        expect(shouldPromptVerification(account(), null, NOW)).toBe(true);
    });

    it('écarté, délai non écoulé : on se tait', () => {
        expect(shouldPromptVerification(account(), NOW + 1000, NOW)).toBe(false);
    });

    it('écarté, délai écoulé : on repropose', () => {
        expect(shouldPromptVerification(account(), NOW - 1, NOW)).toBe(true);
    });

    it('exactement à l\'échéance : on repropose', () => {
        expect(shouldPromptVerification(account(), NOW, NOW)).toBe(true);
    });

    it('un compte hors de danger n\'est jamais sollicité, même sans report', () => {
        expect(shouldPromptVerification(account({ emailVerified: true }), null, NOW)).toBe(false);
    });
});

describe('snoozeUntil', () => {
    it('reporte de SNOOZE_DAYS jours', () => {
        const now = 1_700_000_000_000;
        expect(snoozeUntil(now) - now).toBe(SNOOZE_DAYS * 86_400_000);
    });

    it('le report suffit à faire taire le bandeau', () => {
        const now = 1_700_000_000_000;
        expect(shouldPromptVerification(account(), snoozeUntil(now), now)).toBe(false);
    });

    it('et le bandeau revient une fois le délai passé', () => {
        const now = 1_700_000_000_000;
        const until = snoozeUntil(now);
        expect(shouldPromptVerification(account(), until, until)).toBe(true);
    });
});

describe('snoozeStorageKey', () => {
    it('est propre à chaque compte : un téléphone peut en voir passer plusieurs', () => {
        expect(snoozeStorageKey('abc')).not.toBe(snoozeStorageKey('def'));
    });
});
