'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import ProfileContent from '@/components/profile/ProfileContent';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, initialize } = useAuthStore();

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

    if (authLoading) {
        return (
            <div className="container-center">
                <div className="spinner-ring" style={{ width: '64px', height: '64px', borderWidth: '4px', borderTopColor: 'transparent', borderRadius: 'var(--radius-full)' }} />
            </div>
        );
    }

    if (!user) return null;

    return <ProfileContent targetUserId={user.userId} isMe={true} />;
}
