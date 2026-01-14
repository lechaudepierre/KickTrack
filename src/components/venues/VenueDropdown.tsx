'use client';

import { useState, useEffect, useRef } from 'react';
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
    noneLabel?: string;
}

export default function VenueDropdown({
    selectedVenue,
    onSelectVenue,
    showNoneOption = true,
    placeholder = 'Sélectionner un stade',
    noneLabel = 'Aucun'
}: VenueDropdownProps) {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [favoriteVenues, setFavoriteVenues] = useState<string[]>([]);
    const [recentVenues, setRecentVenues] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        e.preventDefault();
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
            venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (venue.address && venue.address.toLowerCase().includes(searchQuery.toLowerCase()))
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

    const handleSelectVenue = (venue: Venue | null) => {
        onSelectVenue(venue);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={styles.button}
            >
                <MapPinIcon className={styles.icon} />
                <span className={styles.label}>
                    {selectedVenue?.name || (showNoneOption ? noneLabel : placeholder)}
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
                            autoFocus
                        />
                    </div>

                    {/* Options */}
                    <div className={styles.options}>
                        {showNoneOption && (
                            <div
                                onClick={() => handleSelectVenue(null)}
                                className={`${styles.option} ${selectedVenue === null ? styles.optionActive : ''}`}
                            >
                                <span>{noneLabel}</span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className={styles.loading}>Chargement...</div>
                        ) : filteredAndSortedVenues.length === 0 ? (
                            <div className={styles.empty}>Aucun stade trouvé</div>
                        ) : (
                            filteredAndSortedVenues.map(venue => {
                                const isFavorite = favoriteVenues.includes(venue.venueId);
                                return (
                                    <div
                                        key={venue.venueId}
                                        onClick={() => handleSelectVenue(venue)}
                                        className={`${styles.option} ${selectedVenue?.venueId === venue.venueId ? styles.optionActive : ''}`}
                                    >
                                        <span className={styles.venueName}>{venue.name}</span>
                                        <div
                                            onClick={(e) => handleToggleFavorite(venue.venueId, e)}
                                            className={styles.favoriteButton}
                                        >
                                            {isFavorite ? (
                                                <StarIconSolid className={styles.starFilled} />
                                            ) : (
                                                <StarIconOutline className={styles.starEmpty} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
