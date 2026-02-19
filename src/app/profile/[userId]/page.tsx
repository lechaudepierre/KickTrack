'use client';

import { useParams } from 'next/navigation';
import ProfileContent from '@/components/profile/ProfileContent';
import { useAuthStore } from '@/lib/stores/authStore';

export default function UserProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const { user: currentUser } = useAuthStore();

    // Determine if it's the current user's profile
    const isMe = currentUser?.userId === userId;

    return <ProfileContent targetUserId={userId} isMe={isMe} />;
}
