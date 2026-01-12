'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getVenues } from '@/lib/firebase/firestore';
import { createTournament } from '@/lib/firebase/tournaments';
import { Venue, TournamentFormat, TournamentMode } from '@/types';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    ArrowLeftIcon,
    UserIcon,
    UsersIcon,
    MapPinIcon,
    ChevronDownIcon,
    TrophyIcon,
    ListBulletIcon
} from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

export default function NewTournamentPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

    const [format, setFormat] = useState<TournamentFormat>('1v1');
    const [mode, setMode] = useState<TournamentMode>('round_robin');
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [targetScore, setTargetScore] = useState<6 | 11>(6);
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
                targetScore
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
                <div className={styles.pageHeader}>
                    <button
                        onClick={() => router.back()}
                        className={styles.backButton}
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className={styles.pageTitle}>Nouveau Tournoi</h1>
                </div>

                {error && (
                    <div className="error-box" style={{ marginBottom: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {/* Venue Selection */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Stade
                        </label>
                        <div className={styles.dropdownContainer}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={styles.dropdownButton}
                            >
                                <MapPinIcon className="w-5 h-5" />
                                <span>{selectedVenue?.name || 'Aucun'}</span>
                                <ChevronDownIcon className={`w-5 h-5 ${styles.chevron} ${isDropdownOpen ? styles.chevronOpen : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    <button
                                        onClick={() => {
                                            setSelectedVenue(null);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`${styles.dropdownItem} ${selectedVenue === null ? styles.dropdownItemActive : ''}`}
                                    >
                                        Aucun
                                    </button>
                                    {venues.map(venue => (
                                        <button
                                            key={venue.venueId}
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
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Mode de tournoi
                        </label>
                        <div className={styles.grid2}>
                            <button
                                onClick={() => setMode('round_robin')}
                                className={`${styles.selectionCard} ${mode === 'round_robin' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <ListBulletIcon className="h-8 w-8 mx-auto mb-2" style={{ color: mode === 'round_robin' ? 'white' : 'var(--color-text-dark)' }} />
                                <p style={{ fontWeight: 600, color: mode === 'round_robin' ? 'white' : 'var(--color-text-dark)', fontSize: '0.875rem' }}>Tous contre tous</p>
                                <p style={{ fontSize: '0.7rem', color: mode === 'round_robin' ? 'rgba(255,255,255,0.7)' : 'rgba(51,51,51,0.5)', marginTop: '4px' }}>Max 8 equipes</p>
                            </button>
                            <button
                                onClick={() => setMode('bracket')}
                                className={`${styles.selectionCard} ${mode === 'bracket' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <TrophyIcon className="h-8 w-8 mx-auto mb-2" style={{ color: mode === 'bracket' ? 'white' : 'var(--color-text-dark)' }} />
                                <p style={{ fontWeight: 600, color: mode === 'bracket' ? 'white' : 'var(--color-text-dark)', fontSize: '0.875rem' }}>Eliminatoire</p>
                                <p style={{ fontSize: '0.7rem', color: mode === 'bracket' ? 'rgba(255,255,255,0.7)' : 'rgba(51,51,51,0.5)', marginTop: '4px' }}>Bracket</p>
                            </button>
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Format des matchs
                        </label>
                        <div className={styles.grid2}>
                            <button
                                onClick={() => setFormat('1v1')}
                                className={`${styles.selectionCard} ${format === '1v1' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <UserIcon className="h-8 w-8 mx-auto mb-2" style={{ color: format === '1v1' ? 'white' : 'var(--color-text-dark)' }} />
                                <p style={{ fontWeight: 600, color: format === '1v1' ? 'white' : 'var(--color-text-dark)' }}>1 vs 1</p>
                            </button>
                            <button
                                onClick={() => setFormat('2v2')}
                                className={`${styles.selectionCard} ${format === '2v2' ? styles.selectionCardActive : styles.selectionCardInactive}`}
                            >
                                <UsersIcon className="h-8 w-8 mx-auto mb-2" style={{ color: format === '2v2' ? 'white' : 'var(--color-text-dark)' }} />
                                <p style={{ fontWeight: 600, color: format === '2v2' ? 'white' : 'var(--color-text-dark)' }}>2 vs 2</p>
                            </button>
                        </div>
                    </div>

                    {/* Target Score */}
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-md)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Score de victoire
                        </label>
                        <div className={styles.grid2}>
                            {([6, 11] as const).map((score) => (
                                <button
                                    key={score}
                                    onClick={() => setTargetScore(score)}
                                    className={`${styles.selectionCard} ${targetScore === score ? styles.selectionCardActive : styles.selectionCardInactive}`}
                                >
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: targetScore === score ? 'white' : 'var(--color-text-dark)' }}>{score}</p>
                                    <p style={{ fontSize: '0.75rem', color: targetScore === score ? 'rgba(255,255,255,0.8)' : 'rgba(51,51,51,0.6)' }}>buts</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div style={{
                        background: 'rgba(255, 215, 0, 0.2)',
                        border: '2px solid #FFD700',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-md)',
                        marginTop: 'var(--spacing-sm)'
                    }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', fontWeight: 500 }}>
                            {mode === 'round_robin'
                                ? `Chaque equipe jouera contre toutes les autres. Maximum ${format === '1v1' ? '8 joueurs' : '8 equipes (16 joueurs)'}.`
                                : `Format elimination directe avec tableau. ${format === '1v1' ? 'Joueurs individuels' : 'Equipes de 2'}.`
                            }
                        </p>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={handleCreateTournament}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            background: '#FFD700',
                            border: '3px solid #333333',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-dark)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            opacity: isLoading ? 0.5 : 1,
                            marginTop: 'var(--spacing-md)'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 6px 0 rgba(0, 0, 0, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? 'Creation...' : 'Creer le tournoi'}
                    </button>
                </div>
            </div>
        </div>
    );
}
