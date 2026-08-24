import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AppColorScheme = 'light' | 'dark';

type ColorSchemeContextValue = {
  /** Esquema resuelto — override manual si existe, si no el del sistema. */
  colorScheme: AppColorScheme;
  /** null = "seguir sistema" (default). */
  override: AppColorScheme | null;
  setOverride: (scheme: AppColorScheme | null) => void;
};

const STORAGE_KEY = 'artrider_color_scheme_override';

const ColorSchemeContext = createContext<ColorSchemeContextValue | undefined>(undefined);

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [override, setOverrideState] = useState<AppColorScheme | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setOverrideState(stored);
    });
  }, []);

  function setOverride(scheme: AppColorScheme | null) {
    setOverrideState(scheme);
    if (scheme) {
      SecureStore.setItemAsync(STORAGE_KEY, scheme);
    } else {
      SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }

  const colorScheme: AppColorScheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, override, setOverride }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorSchemeContext() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error('useColorSchemeContext debe usarse dentro de ColorSchemeProvider');
  return ctx;
}
