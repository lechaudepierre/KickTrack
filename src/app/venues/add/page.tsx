'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createVenue, checkVenueDuplicate } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { FieldBackground } from '@/components/FieldDecorations';
import { VenueType } from '@/types';
import {
    BuildingStorefrontIcon,
    HomeIcon,
    UserGroupIcon,
    MapPinIcon,
    ArrowLeftIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import styles from './page.module.css';

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
            setError('Vous devez être connecté pour ajouter un stade');
            return;
        }

        if (!name.trim()) {
            setError('Le nom du stade est requis');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Check for duplicate name
            const isDuplicate = await checkVenueDuplicate(name.trim());
            if (isDuplicate) {
                setError('Un stade avec ce nom existe déjà');
                setIsLoading(false);
                return;
            }

            await createVenue({
                name: name.trim(),
                type,
                address: address.trim() || undefined
            }, user.userId);

            router.push('/venues');
        } catch (err) {
            console.error('Error creating venue:', err);
            setError('Erreur lors de la création du stade');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <FieldBackground />

            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <Link href="/venues" className={styles.backLink}>
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Retour aux stades
                    </Link>

                    <h1 className={styles.title}>
                        Ajouter un <span className={styles.titleAccent}>Stade</span>
                    </h1>
                    <p className={styles.subtitle}>Où se trouve ce nouveau babyfoot ?</p>
                </div>

                <div className={styles.formCard}>
                    <div className={styles.cardAccent} />

                    {error && (
                        <div className={styles.errorBox}>
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Nom du stade
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Le Café des Sports"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="input-field"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Type de stade
                            </label>
                            <div className={styles.typeGrid}>
                                {venueTypes.map((vt) => (
                                    <button
                                        key={vt.type}
                                        type="button"
                                        onClick={() => setType(vt.type)}
                                        className={`${styles.typeButton} ${type === vt.type ? styles.typeButtonActive : styles.typeButtonInactive}`}
                                    >
                                        <vt.icon className={styles.typeIcon} />
                                        <span className={styles.typeLabel}>{vt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Adresse (optionnel)
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: 123 Rue de la Paix"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="input-field"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full"
                            style={{ padding: 0, border: 'none', background: 'transparent' }}
                        >
                            <div className="btn-primary-shadow" />
                            <div className="btn-primary-content" style={{ width: '100%' }}>
                                {isLoading ? 'Création...' : 'Ajouter le stade'}
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
