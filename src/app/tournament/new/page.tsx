'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenues } from '@/lib/firebase/firestore';
import { createTournament } from '@/lib/firebase/tournaments';
import { Venue, TournamentFormat, TournamentMode } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    UserIcon,
    UsersIcon,
    MapPinIcon,
    ChevronDownIcon,
    TrophyIcon,
    ListBulletIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';
import { PageHeader, Button } from '@/components/common/ui';
import s from './page.module.css';
import { MODES } from '@/lib/gamemodes/modes';
import ModeInfoModal, { ModeInfoButton } from '@/components/game/ModeInfoModal';
import type { GameMode } from '@/lib/gamemodes/types';
import { useFeature } from '@/lib/features';

export default function NewTournamentPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [format, setFormat] = useState<TournamentFormat>('1v1');
    const [mode, setMode] = useState<TournamentMode>('round_robin');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [modeId, setModeId] = useState('normal');
    const [infoMode, setInfoMode] = useState<GameMode | null>(null);
    const v2Enabled = useFeature('v2');
    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = initialize();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [initialize]);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        loadVenues();
    }, []);

    const loadVenues = async () => {
        try {
            const data = await getVenues({ limit: 20 });
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        }
    };

    const handleCreateTournament = async () => {
        if (!user) return;

        setIsLoading(true);
        setError('');

        try {
            const tournament = await createTournament(
                user.userId,
                user.username,
                selectedVenue?.venueId || 'none',
                selectedVenue?.name || 'Aucun',
                format,
                mode,
                modeId
            );
            router.push(`/tournament/${tournament.tournamentId}`);
        } catch (err: unknown) {
            console.error('Error creating tournament:', err);
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la creation';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="container-center">
                <div className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <PageHeader title="Nouveau Tournoi" />

                {error && (
                    <div className={`error-box ${s.errorBox}`}>
                        {error}
                    </div>
                )}

                <div className={s.form}>
                    {/* Venue Selection */}
                    <div>
                        <label className={styles.fieldLabel}>Stade</label>
                        <div className={styles.dropdownContainer}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={styles.dropdownButton}
                            >
                                <MapPinIcon width={20} height={20} />
                                <span>{selectedVenue?.name || 'Aucun'}</span>
                                <ChevronDownIcon width={20} height={20} className={`${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    <button onClick={() => {
                                            setSelectedVenue(null);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`${styles.dropdownItem} ${selectedVenue === null ? styles.dropdownItemActive : ''}`}
                                    >
                                        Aucun
                                    </button>
                                    {venues.map(venue => (
                                        <button key={venue.venueId}
                                            onClick={() => {
                                                setSelectedVenue(venue);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`${styles.dropdownItem} ${selectedVenue?.venueId === venue.venueId ? styles.dropdownItemActive : ''}`}
                                        >
                                            {venue.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tournament Mode Selection */}
                    {/* Mode de jeu — chantier 9.11.
                        Choisi une fois pour tout le tournoi : des règles qui
                        changeraient d'un match à l'autre n'auraient aucun sens. */}
                    {v2Enabled && (
                        <div>
                            <label className={styles.fieldLabel}>Mode de jeu</label>
                            <div className={styles.grid2}>
                                {MODES.map(m => (
                                    <div key={m.id} className={s.modeSlot}>
                                        <button onClick={() => setModeId(m.id)}
                                            className={`${styles.selectionCard} ${s.modeButton} ${modeId === m.id ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                            aria-pressed={modeId === m.id}
                                        >
                                            <p className={s.cardTitle}>{m.name}</p>
                                        </button>
                                        <ModeInfoButton modeName={m.name} onClick={() => setInfoMode(m)} />
                                    </div>
                                ))}
                            </div>
                            <p className={styles.fieldHint}>
                                {MODES.find(m => m.id === modeId)?.description}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className={styles.fieldLabel}>Mode de tournoi</label>
                        <div className={styles.grid2}>
                            <button onClick={() => setMode('round_robin')}
                                className={`${styles.selectionCard} ${mode === 'round_robin' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <ListBulletIcon width={28} height={28} />
                                <p className={s.cardTitle}>Tous contre tous</p>
                                <p className={s.cardSubtitle}>Max 8 equipes</p>
                            </button>
                            <button onClick={() => setMode('bracket')}
                                className={`${styles.selectionCard} ${mode === 'bracket' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <TrophyIcon width={28} height={28} />
                                <p className={s.cardTitle}>Eliminatoire</p>
                                <p className={s.cardSubtitle}>Bracket</p>
                            </button>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className={styles.fieldLabel}>Format des matchs</label>
                        <div className={styles.grid2}>
                            <button onClick={() => setFormat('1v1')}
                                className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <UserIcon width={28} height={28} />
                                <p className={s.cardTitle}>1 vs 1</p>
                            </button>
                            <button onClick={() => setFormat('2v2')}
                                className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <UsersIcon width={28} height={28} />
                                <p className={s.cardTitle}>2 vs 2</p>
                            </button>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className={s.infoBox}>
                        <p className={s.infoText}>
                            {mode === 'round_robin'
                                ? `Chaque equipe jouera contre toutes les autres. Maximum ${format === '1v1' ? '8 joueurs' : '8 equipes (16 joueurs)'}.`
                                : `Format elimination directe avec tableau. ${format === '1v1' ? 'Joueurs individuels' : 'Equipes de 2'}.`
                            }
                        </p>
                    </div>

                    {/* Create Button */}
                    <Button onClick={handleCreateTournament}
                        isLoading={isLoading}
                        variant="accent"
                        fullWidth
                        className={s.submit}
                    >
                        {isLoading ? 'Création...' : 'Créer le tournoi'}
                    </Button>
                </div>
            </div>

            <ModeInfoModal mode={infoMode} onClose={() => setInfoMode(null)} />
        </div>
    );
}
