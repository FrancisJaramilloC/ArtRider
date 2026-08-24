import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

export function ProtectedScreen({ children }: { children: ReactNode }) {
    const { session, loading } = useAuth();

    if (loading) {
        return <View style={{ flex: 1 }} />;
    }

    if (!session) {
        return <Redirect href="/login" />;
    }

    return <>{children}</>;
}