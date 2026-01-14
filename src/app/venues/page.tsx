'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/common/ui';
import { getVenues, searchVenues } from '@/lib/firebase/firestore';
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
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                        <h1 className={styles.pageTitle}>Stades de jeu</h1>
                        <p className="text-secondary text-sm">{venues.length} stades enregistrés</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} style={{ border: 'none', background: 'none', padding: 0 }}>
                        <div className="btn-primary" style={{ marginBottom: 0 }}>
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content" style={{ padding: '0.375rem 0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0' }}>
                                <PlusIcon className="h-4 w-4" />
                            </div>
                        </div>
                    </button>
                </div>

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
                        <p className={styles.emptyText}>Aucun stade trouvé</p>
                        <button onClick={() => setIsModalOpen(true)} style={{ border: 'none', background: 'none', padding: 0 }}>
                            <div className="btn-secondary" style={{ display: 'inline-block' }}>
                                <div className="btn-secondary-shadow" />
                                <div className="btn-secondary-content">
                                    Ajouter un stade
                                </div>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {filteredVenues.map((venue) => (
                            <div
                                key={venue.venueId}
                                className={styles.listItem}
                            >
                                <div className={`p-3 rounded-xl`} style={{ background: 'rgba(51, 51, 51, 0.05)', color: 'var(--color-text-dark)' }}>
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
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--color-text-dark)' }}>
                                        {venue.stats.totalGames}
                                    </p>
                                    <p style={{ fontSize: '0.625rem', color: 'rgba(51, 51, 51, 0.4)', fontWeight: 800, textTransform: 'uppercase' }}>
                                        parties
                                    </p>
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
                <AddVenueModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={loadVenues}
                />
            </div>
        </div>
    );
}
