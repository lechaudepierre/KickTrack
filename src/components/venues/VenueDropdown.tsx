'use client';

import { useState, useEffect } from 'react';
import { Venue } from '@/types';
import { getVenues, getUserFavoriteVenues, getUserRecentVenues, toggleVenueFavorite } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import {
    MapPinIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import styles from './VenueDropdown.module.css';

interface VenueDropdownProps {
    selectedVenue: Venue | null;
    onSelectVenue: (venue: Venue | null) => void;
    showNoneOption?: boolean;
    placeholder?: string;
}

export default function VenueDropdown({
    selectedVenue,
    onSelectVenue,
    showNoneOption = true,
    placeholder = 'Sélectionner un stade'
}: VenueDropdownProps) {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [favoriteVenues, setFavoriteVenues] = useState<string[]>([]);
    const [recentVenues, setRecentVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const venueData = await getVenues();
            setVenues(venueData);

            if (user) {
                const favorites = await getUserFavoriteVenues(user.userId);
                setFavoriteVenues(favorites);

                const recent = await getUserRecentVenues(user.userId);
                setRecentVenues(recent);
            }
        } catch (error) {
            console.error('Error loading venues:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleFavorite = async (venueId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        try {
            await toggleVenueFavorite(user.userId, venueId);
            setFavoriteVenues(prev =>
                prev.includes(venueId)
                    ? prev.filter(id => id !== venueId)
                    : [...prev, venueId]
            );
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    // Filter and sort venues
    const filteredAndSortedVenues = venues
        .filter(venue =>
            searchQuery.trim() === '' ||
            venue.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            const aIsFavorite = favoriteVenues.includes(a.venueId);
            const bIsFavorite = favoriteVenues.includes(b.venueId);
            const aIsRecent = recentVenues.includes(a.venueId);
            const bIsRecent = recentVenues.includes(b.venueId);

            // Favorites first
            if (aIsFavorite && !bIsFavorite) return -1;
            if (!aIsFavorite && bIsFavorite) return 1;

            // Then recently used
            if (aIsRecent && !bIsRecent) return -1;
            if (!aIsRecent && bIsRecent) return 1;

            // Finally alphabetical
            return a.name.localeCompare(b.name);
        });

    return (
        <div className={styles.container}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={styles.button}
            >
                <MapPinIcon className={styles.icon} />
                <span className={styles.label}>
                    {selectedVenue?.name || (showNoneOption ? 'Aucun' : placeholder)}
                </span>
                <ChevronDownIcon className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* Search */}
                    <div className={styles.searchContainer}>
                        <MagnifyingGlassIcon className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Options */}
                    <div className={styles.options}>
                        {showNoneOption && (
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectVenue(null);
                                    setIsOpen(false);
                                    setSearchQuery('');
                                }}
                                className={`${styles.option} ${selectedVenue === null ? styles.optionActive : ''}`}
                            >
                                <span>Aucun</span>
                            </button>
                        )}

                        {isLoading ? (
                            <div className={styles.loading}>Chargement...</div>
                        ) : filteredAndSortedVenues.length === 0 ? (
                            <div className={styles.empty}>Aucun stade trouvé</div>
                        ) : (
                            filteredAndSortedVenues.map(venue => {
                                const isFavorite = favoriteVenues.includes(venue.venueId);
                                return (
                                    <button
                                        key={venue.venueId}
                                        type="button"
                                        onClick={() => {
                                            onSelectVenue(venue);
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={`${styles.option} ${selectedVenue?.venueId === venue.venueId ? styles.optionActive : ''}`}
                                    >
                                        <span className={styles.venueName}>{venue.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => handleToggleFavorite(venue.venueId, e)}
                                            className={styles.favoriteButton}
                                        >
                                            {isFavorite ? (
                                                <StarIconSolid className={styles.starFilled} />
                                            ) : (
                                                <StarIconOutline className={styles.starEmpty} />
                                            )}
                                        </button>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
