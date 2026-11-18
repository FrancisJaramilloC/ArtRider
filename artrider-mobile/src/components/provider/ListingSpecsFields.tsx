import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/ui/Chip';
import { FormField } from '@/components/ui/FormField';
import { Text } from '@/components/ui/Text';
import { Radius, Rhythm, Spacing } from '@/constants/theme';
import { specFieldsFor, specQuality, type SpecField, type SpecForm } from '@/constants/listingSpecs';
import { useTheme } from '@/hooks/use-theme';

/** Solo dígitos y un separador decimal. */
const cleanNumber = (value: string) => value.replace(/[^0-9.,]/g, '');

function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>{children}</View>;
}

function SpecFieldInput({ field, value, onChange }: { field: SpecField; value: string; onChange: (next: string) => void }) {
  if (field.kind === 'choice' || field.kind === 'boolean') {
    const options = field.kind === 'boolean' ? [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }] : field.options;
    return (
      <View style={{ gap: Spacing.two }}>
        <Text variant="bodyStrong">{field.label}</Text>
        <ChipRow>
          {options.map((option) => (
            // Tocar la opción activa la quita: todos los campos son opcionales.
            <Chip key={option.value} label={option.label} active={value === option.value} onPress={() => onChange(value === option.value ? '' : option.value)} />
          ))}
        </ChipRow>
      </View>
    );
  }
  if (field.kind === 'number') {
    return (
      <FormField
        label={field.unit ? `${field.label} (${field.unit})` : field.label}
        value={value}
        onChangeText={(text) => onChange(cleanNumber(text))}
        keyboardType="decimal-pad"
        placeholder="0"
        maxLength={8}
      />
    );
  }
  return <FormField label={field.label} value={value} onChangeText={onChange} placeholder={field.placeholder} maxLength={field.maxLength} />;
}

/** «Calidad de tu publicación»: barra y consejos. Solo aconseja, nunca bloquea publicar. */
export function ListingQuality({ category, specs }: { category: string; specs: SpecForm }) {
  const colors = useTheme();
  const quality = specQuality(category, specs);
  return (
    <View
      accessible
      accessibilityLabel={`Calidad de tu publicación: ${quality.percent} por ciento. ${quality.tips.join('. ')}`}
      style={{ gap: Spacing.two, padding: Rhythm.cardPadding + Spacing.one, borderRadius: Radius.card, backgroundColor: colors.backgroundElement }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="bodyStrong">Calidad de tu publicación</Text>
        <Text variant="bodyStrong" color="primary">
          {quality.percent}%
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: Radius.full, backgroundColor: colors.backgroundSelected, overflow: 'hidden' }}>
        <View style={{ width: `${quality.percent}%`, height: '100%', borderRadius: Radius.full, backgroundColor: colors.primary }} />
      </View>
      {quality.tips.length > 0 ? (
        <View style={{ gap: Spacing.one }}>
          {quality.tips.map((tip) => (
            <View key={tip} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }}>
              <Ionicons name="bulb-outline" size={16} color={colors.textSecondary} style={{ marginTop: Spacing.half }} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="caption" color="textSecondary">
          ¡Excelente! Tu equipo tiene todos los datos.
        </Text>
      )}
      <Text variant="caption" color="textMuted">
        Los datos extra ayudan a que los Riders encuentren tu equipo. Puedes publicar sin completarlos.
      </Text>
    </View>
  );
}

/** Campos de especificaciones de la categoría (más los comunes) + indicador de calidad. Todo opcional. */
export function ListingSpecsFields({ category, specs, onChange }: { category: string; specs: SpecForm; onChange: (key: string, value: string) => void }) {
  const fields = specFieldsFor(category);
  return (
    <View style={{ gap: Rhythm.titleToContent + Spacing.one }}>
      <ListingQuality category={category} specs={specs} />
      {fields.map((field) => (
        <SpecFieldInput key={field.key} field={field} value={specs[field.key] ?? ''} onChange={(next) => onChange(field.key, next)} />
      ))}
    </View>
  );
}
