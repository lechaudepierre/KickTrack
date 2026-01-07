'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/common/ui';
import { getVenues, searchVenues } from '@/lib/firebase/firestore';
import { Venue, VenueType } from '@/types';
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
import styles from '@/styles/content-page.module.css';

const venueTypeIcons: Record<VenueType, React.ReactNode> = {
    bar: <BuildingStorefrontIcon className="h-5 w-5" />,
    home: <HomeIcon className="h-5 w-5" />,
    cercle: <UserGroupIcon className="h-5 w-5" />,
    other: <MapPinIcon className="h-5 w-5" />
};

const venueTypeLabels: Record<VenueType, string> = {
    bar: 'Bar',
    home: 'Domicile',
    cercle: 'Cercle',
    other: 'Autre'
};

const venueTypeColors: Record<VenueType, string> = {
    bar: 'bg-amber-500/20 text-amber-400',
    home: 'bg-blue-500/20 text-blue-400',
    cercle: 'bg-purple-500/20 text-purple-400',
    other: 'bg-slate-500/20 text-slate-400'
};

export default function VenuesPage() {
    const router = useRouter();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<VenueType | 'all'>('all');

    useEffect(() => {
        loadVenues();
    }, []);

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
                <div className={styles.pageHeader}>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div style={{ flex: 1 }}>
                        <h1 className={styles.pageTitle}>Lieux de jeu</h1>
                        <p className="text-secondary text-sm">{venues.length} lieux enregistrés</p>
                    </div>
                    <Link href="/venues/add">
                        <div className="btn-primary" style={{ marginBottom: 0 }}>
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content" style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <PlusIcon className="h-5 w-5" />
                                Ajouter
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Search */}
                <div className={styles.searchWrapper}>
                    <MagnifyingGlassIcon className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Rechercher un lieu..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {/* Filter Pills */}
                <div className={styles.filterPills}>
                    {(['all', 'bar', 'home', 'cercle', 'other'] as const).map((type) => (
                        <button
                            key={type}
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
                        <p className={styles.emptyText}>Aucun lieu trouvé</p>
                        <Link href="/venues/add">
                            <div className="btn-secondary" style={{ display: 'inline-block' }}>
                                <div className="btn-secondary-shadow" />
                                <div className="btn-secondary-content">
                                    Ajouter un lieu
                                </div>
                            </div>
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {filteredVenues.map((venue) => (
                            <Link
                                key={venue.venueId}
                                href={`/venues/${venue.venueId}`}
                            >
                                <div className={styles.listItem}>
                                    <div className={`p-3 rounded-xl ${venueTypeColors[venue.type]}`}>
                                        {venueTypeIcons[venue.type]}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {venue.name}
                                        </h3>
                                        <p className="text-secondary" style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {venue.address || venueTypeLabels[venue.type]}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-field-green)' }}>
                                            {venue.stats.totalGames}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            parties
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Back to Dashboard */}
                <div style={{ marginTop: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Link href="/dashboard" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                        ← Retour au tableau de bord
                    </Link>
                </div>
            </div>
        </div>
    );
}
