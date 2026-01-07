'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/common/ui';
import { createVenue } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import { VenueType } from '@/types';
import {
    BuildingStorefrontIcon,
    HomeIcon,
    UserGroupIcon,
    MapPinIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

const venueTypes: { type: VenueType; label: string; icon: React.ElementType }[] = [
    { type: 'bar', label: 'Bar', icon: BuildingStorefrontIcon },
    { type: 'home', label: 'Domicile', icon: HomeIcon },
    { type: 'cercle', label: 'Cercle', icon: UserGroupIcon },
    { type: 'other', label: 'Autre', icon: MapPinIcon },
];

export default function AddVenuePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [name, setName] = useState('');
    const [type, setType] = useState<VenueType>('bar');
    const [address, setAddress] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Vous devez être connecté pour ajouter un lieu');
            return;
        }

        if (!name.trim()) {
            setError('Le nom du lieu est requis');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await createVenue({
                name: name.trim(),
                type,
                address: address.trim() || undefined
            }, user.userId);

            router.push('/venues');
        } catch (err) {
            console.error('Error creating venue:', err);
            setError('Erreur lors de la création du lieu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] relative flex flex-col items-center justify-center p-6">
            <FieldBackground />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8">
                    <Link
                        href="/venues"
                        className="inline-flex items-center text-[#94A3B8] hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Retour aux lieux
                    </Link>

                    <h1 className="text-3xl font-black text-white mb-2">
                        Ajouter un <span className="text-[#10B981]">Lieu</span>
                    </h1>
                    <p className="text-[#94A3B8]">Où se trouve ce nouveau babyfoot ?</p>
                </div>

                <div className="bg-[#1E293B] border-4 border-[#334155] p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#10B981]" />

                    {error && (
                        <div className="mb-6 p-4 bg-[#0F172A] border-4 border-[#F97316] text-[#F97316] font-bold text-sm">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-white font-black text-sm uppercase tracking-wide mb-2">
                                Nom du lieu
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Le Café des Sports"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-[#0F172A] border-4 border-[#334155] text-white font-semibold placeholder-[#475569] focus:border-[#10B981] focus:outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-white font-black text-sm uppercase tracking-wide mb-2">
                                Type de lieu
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {venueTypes.map((vt) => (
                                    <button
                                        key={vt.type}
                                        type="button"
                                        onClick={() => setType(vt.type)}
                                        className={`flex flex-col items-center justify-center p-3 border-4 transition-all ${type === vt.type
                                            ? 'bg-[#10B981] border-[#10B981] text-[#0F172A]'
                                            : 'bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#475569]'
                                            }`}
                                    >
                                        <vt.icon className="w-6 h-6 mb-1" />
                                        <span className="text-xs font-bold uppercase">{vt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-white font-black text-sm uppercase tracking-wide mb-2">
                                Adresse (optionnel)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: 123 Rue de la Paix"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0F172A] border-4 border-[#334155] text-white font-semibold placeholder-[#475569] focus:border-[#10B981] focus:outline-none transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full group relative mt-4"
                        >
                            <div className="absolute inset-0 bg-[#059669] translate-y-2" />
                            <div className="relative bg-[#10B981] border-4 border-white text-[#0F172A] font-black text-lg py-4 transition-transform group-hover:-translate-y-1 group-active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isLoading ? 'CRÉATION...' : 'AJOUTER LE LIEU'}
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
