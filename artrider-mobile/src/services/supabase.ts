import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore limita cada valor a ~2048 bytes en Android. La sesión de
// Supabase (JWT + refresh token) puede superarlo, así que la partimos
// en chunks al guardarla y la reconstruimos al leerla.
const CHUNK_SIZE = 1800;

class ChunkedSecureStoreAdapter {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        }
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
        if (!chunkCountStr) {
            return SecureStore.getItemAsync(key);
        }
        const chunkCount = parseInt(chunkCountStr, 10);
        const chunks: string[] = [];
        for (let i = 0; i < chunkCount; i++) {
            const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
            if (chunk === null) return null;
            chunks.push(chunk);
        }
        return chunks.join('');
    }

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
            return;
        }
        const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
        for (let i = 0; i < chunkCount; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await SecureStore.setItemAsync(`${key}_${i}`, chunk);
        }
    }

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
            return;
        }
        const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
        if (chunkCountStr) {
            const chunkCount = parseInt(chunkCountStr, 10);
            for (let i = 0; i < chunkCount; i++) {
                await SecureStore.deleteItemAsync(`${key}_${i}`);
            }
            await SecureStore.deleteItemAsync(`${key}_chunks`);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: new ChunkedSecureStoreAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Sin esto, el token puede expirar mientras la app está en background,
// porque el timer de auto-refresh de supabase-js no sabe que la app
// está minimizada.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});