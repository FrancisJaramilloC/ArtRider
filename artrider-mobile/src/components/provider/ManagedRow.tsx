import { ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { MinTouch, Radius, Rhythm, Spacing, Thumb } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ManagedRowProps = {
  title: string;
  meta: string;
  coverUrl: string | null;
  published: boolean;
  busy: boolean;
  onTogglePublished: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Fila de anuncio/paquete del proveedor. Dos niveles para que ningún control apriete al título:
 * arriba miniatura + texto (hasta 2 líneas); abajo interruptor «Publicado» a la izquierda y
 * acciones (editar/eliminar, 44pt) a la derecha, alineadas al centro vertical.
 */
export function ManagedRow({ title, meta, coverUrl, published, busy, onTogglePublished, onEdit, onDelete }: ManagedRowProps) {
  const colors = useTheme();

  return (
    <View style={{ backgroundColor: colors.backgroundElement, borderRadius: Radius.card, padding: Rhythm.cardPadding, gap: Rhythm.cardPadding }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Rhythm.cardPadding }}>
        <View style={{ width: Thumb.list, height: Thumb.list, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: colors.backgroundSelected }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={{ width: Thumb.list, height: Thumb.list }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={22} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.half }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MinTouch }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          {busy ? (
            <View style={{ width: 51, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <Switch
              value={published}
              onValueChange={onTogglePublished}
              label={published ? 'Publicado. Tocar para pasar a borrador' : 'Borrador. Tocar para publicar'}
            />
          )}
          <Text variant="captionStrong" color={published ? 'primary' : 'textSecondary'}>
            {published ? 'Publicado' : 'Borrador'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton icon="pencil-outline" label="Editar" onPress={onEdit} />
          <IconButton icon="trash-outline" label="Eliminar" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
}
