import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FormField } from '@/components/ui/FormField';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { CATEGORIES } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { cityKey } from '@/utils/city';
import type { Ionicons } from '@expo/vector-icons';

export type SearchFiltersSheetProps = {
  visible: boolean;
  onClose: () => void;
  cities: string[];
  city: string | null;
  onCityChange: (next: string | null) => void;
  maxPrice: string;
  onMaxPriceChange: (next: string) => void;
  category: string;
  onCategoryChange: (next: string) => void;
  resultCount: number;
  onReset: () => void;
  canReset: boolean;
};

/** Hoja de filtros (estilo Airbnb): ciudad, precio máximo por día y categoría. Los cambios se aplican al instante. */
export function SearchFiltersSheet({
  visible,
  onClose,
  cities,
  city,
  onCityChange,
  maxPrice,
  onMaxPriceChange,
  category,
  onCategoryChange,
  resultCount,
  onReset,
  canReset,
}: SearchFiltersSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          <Button label="Limpiar" variant="ghost" fullWidth={false} onPress={onReset} disabled={!canReset} />
          <Button label={`Ver ${resultCount} ${resultCount === 1 ? 'resultado' : 'resultados'}`} onPress={onClose} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={{ gap: Spacing.four, paddingBottom: Spacing.three }}>
        <Text variant="title" accessibilityRole="header">
          Filtros
        </Text>

        {cities.length > 0 ? (
          <View style={{ gap: Spacing.two }}>
            <Text variant="bodyStrong">Ciudad</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {cities.map((name) => {
                const active = city !== null && cityKey(city) === cityKey(name);
                return <Chip key={name} label={name} active={active} onPress={() => onCityChange(active ? null : name)} />;
              })}
            </View>
          </View>
        ) : null}

        <FormField
          label="Precio máximo por día"
          leftIcon="cash-outline"
          placeholder="400"
          hint="En dólares."
          keyboardType="number-pad"
          maxLength={6}
          value={maxPrice}
          onChangeText={(next) => onMaxPriceChange(next.replace(/\D/g, ''))}
        />

        <View style={{ gap: Spacing.two }}>
          <Text variant="bodyStrong">Categoría</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {CATEGORIES.map(({ id, label, icon }) => (
              <Chip key={id} label={label} icon={icon as keyof typeof Ionicons.glyphMap} active={category === id} onPress={() => onCategoryChange(id)} />
            ))}
          </View>
        </View>
      </View>
    </Sheet>
  );
}
