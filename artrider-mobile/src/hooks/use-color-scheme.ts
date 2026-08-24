import { useColorSchemeContext } from '@/contexts/ColorSchemeContext';

/** Esquema resuelto de la app — respeta el override manual del toggle en Perfil. */
export function useColorScheme() {
  return useColorSchemeContext().colorScheme;
}
