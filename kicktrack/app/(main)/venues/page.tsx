'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { getVenues, searchVenues } from '@/lib/firebase/firestore';
import { Venue, VenueType } from '@/types';
import {
    MapPinIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    BuildingStorefrontIcon,
    HomeIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';

const venueTypeIcons: Record<VenueType, React.ReactNode> = {
    bar: <BuildingStorefrontIcon className="h-5 w-5" />,
    home: <HomeIcon className="h-5 w-5" />,
    club: <UserGroupIcon className="h-5 w-5" />,
    other: <MapPinIcon className="h-5 w-5" />
};

const venueTypeLabels: Record<VenueType, string> = {
    bar: 'Bar',
    home: 'Domicile',
    club: 'Club',
    other: 'Autre'
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="p-6 max-w-lg mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Lieux de jeu</h1>
                        <p className="text-slate-400 text-sm">{venues.length} lieux enregistrés</p>
                    </div>
                    <Link href="/venues/add">
                        <Button size="sm">
                            <PlusIcon className="h-5 w-5" />
                            Ajouter
                        </Button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un lieu..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(['all', 'bar', 'home', 'club', 'other'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === type
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-800/50 text-slate-400 hover:text-white'
                                }`}
                        >
                            {type === 'all' ? 'Tous' : venueTypeLabels[type]}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
                    </div>
                ) : filteredVenues.length === 0 ? (
                    <div className="text-center py-12">
                        <MapPinIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">Aucun lieu trouvé</p>
                        <Link href="/venues/add">
                            <Button variant="secondary">Ajouter un lieu</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredVenues.map((venue) => (
                            <Link
                                key={venue.venueId}
                                href={`/venues/${venue.venueId}`}
                                className="block"
                            >
                                <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-all">
                                    <div className={`p-3 rounded-xl ${venue.type === 'bar' ? 'bg-amber-500/20 text-amber-400' :
                                            venue.type === 'home' ? 'bg-blue-500/20 text-blue-400' :
                                                venue.type === 'club' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-slate-700/50 text-slate-400'
                                        }`}>
                                        {venueTypeIcons[venue.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white truncate">{venue.name}</h3>
                                        <p className="text-sm text-slate-400 truncate">
                                            {venue.address || venueTypeLabels[venue.type]}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-emerald-400">{venue.stats.totalGames}</p>
                                        <p className="text-xs text-slate-500">parties</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Back to Dashboard */}
                <div className="mt-8 text-center">
                    <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
                        ← Retour au tableau de bord
                    </Link>
                </div>
            </div>
        </div>
    );
}
