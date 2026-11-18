import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import type { ErrorInfo } from '@/utils/errors';
import { Button } from './Button';
import { Text } from './Text';

export type ErrorStateProps = {
  /** Error de la carga: define el mensaje y el ícono (sin conexión, tardando, genérico). */
  error?: ErrorInfo | null;
  /** Sobrescribe el mensaje corto. */
  message?: string;
  onRetry: () => void;
  /** Ocupa el área libre y centra (descuenta la barra de pestañas flotante). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Estado de error: ícono, mensaje corto en español y botón «Reintentar». El detalle técnico solo se
 * muestra en __DEV__. Distinto del estado vacío (que es «no hay nada», no «falló»).
 */
export function ErrorState({ error, message, onRetry, fill = false, style }: ErrorStateProps) {
  const colors = useTheme();
  const { bottomInset } = useLayout();
  const kind = error?.kind ?? 'unknown';
  const icon = kind === 'offline' ? 'cloud-offline-outline' : kind === 'timeout' ? 'time-outline' : kind === 'permission' ? 'lock-closed-outline' : 'alert-circle-outline';
  const title = kind === 'offline' ? 'Sin conexión' : kind === 'timeout' ? 'La carga está tardando' : kind === 'permission' ? 'Sin permiso' : 'No pudimos cargar';

  return (
    <View
      accessible
      accessibilityRole="alert"
      style={[
        { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingVertical: Spacing.five, paddingHorizontal: Spacing.three },
        fill ? { flex: 1, paddingBottom: bottomInset } : null,
        style,
      ]}
    >
      <View style={{ width: 72, height: 72, borderRadius: Radius.full, backgroundColor: colors.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={32} color={colors.destructive} />
      </View>
      <View style={{ gap: Spacing.one, alignItems: 'center' }}>
        <Text variant="subtitle" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
          {message ?? error?.message ?? 'Inténtalo de nuevo en unos segundos.'}
        </Text>
        {__DEV__ && error?.detail ? (
          <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }} selectable>
            {error.detail}
          </Text>
        ) : null}
      </View>
      {/* Un error de permisos no se arregla reintentando: sin botón. */}
      {kind === 'permission' ? null : <Button label="Reintentar" icon="refresh" onPress={onRetry} variant="tonal" size="sm" style={{ alignSelf: 'center' }} />}
    </View>
  );
}

/** Aviso discreto cuando falla un refresco y se conservan los datos que ya se veían. */
export function RefreshErrorNotice({ error, onRetry }: { error: ErrorInfo; onRetry: () => void }) {
  const colors = useTheme();
  const { gutter } = useLayout();
  return (
    <View
      accessibilityRole="alert"
      style={{
        marginHorizontal: gutter,
        marginBottom: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingLeft: Spacing.snug,
        borderRadius: Radius.xl,
        backgroundColor: colors.destructiveSoft,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={18} color={colors.destructive} />
      <Text variant="caption" color="destructive" style={{ flex: 1, minWidth: 0 }} numberOfLines={2}>
        No pudimos actualizar. Mostrando los datos anteriores.
      </Text>
      <Button label="Reintentar" variant="ghost" size="sm" fullWidth={false} onPress={onRetry} />
    </View>
  );
}
