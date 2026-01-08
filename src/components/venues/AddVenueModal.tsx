'use client';

import { useState } from 'react';
import { createVenue } from '@/lib/firebase/firestore';
import { useAuthStore } from '@/lib/stores/authStore';
import { VenueType } from '@/types';
import {
    BuildingStorefrontIcon,
    HomeIcon,
    UserGroupIcon,
    MapPinIcon,
    XMarkIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import styles from './AddVenueModal.module.css';

const venueTypes: { type: VenueType; label: string; icon: React.ElementType }[] = [
    { type: 'bar', label: 'Bar', icon: BuildingStorefrontIcon },
    { type: 'home', label: 'Domicile', icon: HomeIcon },
    { type: 'cercle', label: 'Cercle', icon: UserGroupIcon },
    { type: 'other', label: 'Autre', icon: MapPinIcon },
];

interface AddVenueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddVenueModal({ isOpen, onClose, onSuccess }: AddVenueModalProps) {
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

            // Reset form
            setName('');
            setType('bar');
            setAddress('');

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error creating venue:', err);
            setError('Erreur lors de la création du lieu');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className={styles.closeButton}>
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <div className={styles.formCard}>
                    {error && (
                        <div className={styles.errorBox}>
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Nom du lieu
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
                                Type de lieu
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
                                {isLoading ? 'Création...' : 'Ajouter le lieu'}
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
