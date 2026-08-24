'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button, PageHeader } from '@/components/common/ui';
import { getVenues, searchVenues, getUserFavoriteVenues, toggleVenueFavorite } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { Venue, VenueType } from '@/types';
import AddVenueModal from '@/components/venues/AddVenueModal';
import { FieldBackground } from '@/components/FieldDecorations';
import {
    MapPinIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    BuildingStorefrontIcon,
    HomeIcon,
    UserGroupIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import styles from '@/styles/content-page.module.css';

const venueTypeIcons: Record<VenueType, React.ReactNode> = {
    bar: <BuildingStorefrontIcon width={20} height={20} />,
    home: <HomeIcon width={20} height={20} />,
    cercle: <UserGroupIcon width={20} height={20} />,
    other: <MapPinIcon width={20} height={20} />
};

const venueTypeLabels: Record<VenueType, string> = {
    bar: 'Bar',
    home: 'Domicile',
    cercle: 'Cercle',
    other: 'Autre'
};

export default function VenuesPage() {
    const { user } = useAuthStore();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<VenueType | 'all'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [favoriteVenues, setFavoriteVenues] = useState<string[]>([]);

    useEffect(() => {
        loadVenues();
    }, []);

    const monId = user?.userId;

    const loadVenues = async () => {
        setIsLoading(true);
        try {
            const data = await getVenues();
            setVenues(data);
        } catch (error) {
            console.error('Error loading venues:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /*
     * On dépend de l'IDENTIFIANT du joueur, pas de son objet : `user` vient
     * d'un abonnement temps réel, sa référence change à chaque mise à jour de
     * profil. Son identifiant, lui, ne bouge pas.
     */
    const loadFavorites = useCallback(async () => {
        if (!monId) return;
        try {
            const favorites = await getUserFavoriteVenues(monId);
            setFavoriteVenues(favorites);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }, [monId]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const handleToggleFavorite = async (venueId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        // Optimistic update
        const wasFavorite = favoriteVenues.includes(venueId);
        const newFavorites = wasFavorite
            ? favoriteVenues.filter(id => id !== venueId)
            : [...favoriteVenues, venueId];

        setFavoriteVenues(newFavorites);

        try {
            await toggleVenueFavorite(user.userId, venueId);
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Rollback on error
            setFavoriteVenues(favoriteVenues);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            const results = await searchVenues(query);
            setVenues(results);
        } else {
            loadVenues();
        }
    };

    const filteredVenues = venues.filter(venue =>
        filter === 'all' || venue.type === filter
    );

    return (
        <div className={styles.pageContainer}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                {/* Header */}
                <PageHeader title="Stades de jeu"
                    subtitle={`${venues.length} stades enregistrés`}
                    action={
                        <Button onClick={() => setIsModalOpen(true)} size="sm" aria-label="Ajouter un stade">
                            <PlusIcon width={16} height={16} />
                        </Button>
                    }
                />

                {/* Search */}
                <div className={styles.searchWrapper}>
                    <MagnifyingGlassIcon className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Rechercher un stade..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {/* Filter Pills */}
                <div className={styles.filterPills}>
                    {(['all', 'bar', 'home', 'cercle', 'other'] as const).map((type) => (
                        <button key={type}
                            onClick={() => setFilter(type)}
                            className={`${styles.filterPill} ${filter === type ? styles.filterPillActive : styles.filterPillInactive}`}
                        >
                            {type === 'all' ? 'Tous' : venueTypeLabels[type]}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                    </div>
                ) : filteredVenues.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MapPinIcon className={styles.emptyIcon} />
                        <p className={styles.emptyText}>Aucun stade trouvé</p>
                        <Button onClick={() => setIsModalOpen(true)} variant="secondary">
                            Ajouter un stade
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {filteredVenues.map((venue) => (
                            <div key={venue.venueId}
                                className={styles.listItem}
                            >
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'rgba(51, 51, 51, 0.05)', color: 'var(--color-text-dark)' }}>
                                    {venueTypeIcons[venue.type]}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontWeight: 700, color: 'var(--color-text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', fontSize: '1rem' }}>
                                        {venue.name}
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: 'rgba(51, 51, 51, 0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                        {venue.address || venueTypeLabels[venue.type]}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <button onClick={(e) => handleToggleFavorite(venue.venueId, e)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0.25rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {favoriteVenues.includes(venue.venueId) ? (
                                            <StarIconSolid style={{ width: '1.5rem', height: '1.5rem', color: 'var(--color-accent)' }} />
                                        ) : (
                                            <StarIconOutline style={{ width: '1.5rem', height: '1.5rem', color: 'rgba(51, 51, 51, 0.3)' }} />
                                        )}
                                    </button>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-text-dark)' }}>
                                            {venue.stats.totalGames}
                                        </p>
                                        <p style={{ fontSize: '0.625rem', color: 'rgba(51, 51, 51, 0.4)', fontWeight: 800, textTransform: 'uppercase' }}>
                                            parties
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Back to Dashboard */}
                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Link href="/dashboard" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                        ← Retour au tableau de bord
                    </Link>
                </div>

                {/* Add Venue Modal */}
                <AddVenueModal isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={loadVenues}
                />
            </div>
        </div>
    );
}
