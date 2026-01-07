import { create } from 'zustand';
import { User } from '@/types';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    setFirebaseUser: (user: FirebaseUser | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
    initialize: () => (() => void) | undefined;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    firebaseUser: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) => set({
        user,
        isAuthenticated: !!user
    }),

    setFirebaseUser: (firebaseUser) => set({ firebaseUser }),

    setLoading: (isLoading) => set({ isLoading }),

    logout: async () => {
        // Dynamic import to avoid SSR issues
        const { logout: firebaseLogout } = await import('@/lib/firebase/auth');
        await firebaseLogout();
        set({ user: null, firebaseUser: null, isAuthenticated: false });
    },

    initialize: () => {
        if (typeof window === 'undefined') {
            set({ isLoading: false });
            return undefined;
        }

        // Dynamic import for client-side only
        let authUnsubscribe: (() => void) | undefined;
        let userUnsubscribe: (() => void) | undefined;

        import('@/lib/firebase/auth').then(({ onAuthChange, subscribeToUser }) => {
            authUnsubscribe = onAuthChange(async (firebaseUser: FirebaseUser | null) => {
                set({ firebaseUser, isLoading: true });

                // Clean up previous user subscription if exists
                if (userUnsubscribe) {
                    userUnsubscribe();
                    userUnsubscribe = undefined;
                }

                if (firebaseUser) {
                    // Subscribe to real-time user updates
                    userUnsubscribe = subscribeToUser(firebaseUser.uid, (userData) => {
                        set({ user: userData, isAuthenticated: !!userData, isLoading: false });
                    });
                } else {
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            });
        });

        return () => {
            if (authUnsubscribe) authUnsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }
}));
