import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Fonts, MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ReviewModal({
    visible,
    title,
    subtitle,
    onCancel,
    onSubmit,
    submitLabel = 'Enviar calificación',
    allowSkip = false,
    onSkip,
}: {
    visible: boolean;
    title: string;
    subtitle?: string;
    onCancel: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    submitLabel?: string;
    allowSkip?: boolean;
    onSkip?: () => void;
}) {
    const colors = useTheme();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (rating === 0) return;
        setSubmitting(true);
        await onSubmit(rating, comment);
        setSubmitting(false);
        setRating(0);
        setComment('');
    }

    return (
        <Sheet visible={visible} onClose={onCancel}>
            <View style={{ gap: Spacing.one, paddingBottom: Spacing.three }}>
                <Text variant="headline" accessibilityRole="header">
                    {title}
                </Text>
                {subtitle ? (
                    <Text variant="body" color="textSecondary">
                        {subtitle}
                    </Text>
                ) : null}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.one, paddingBottom: Spacing.three }}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                        key={n}
                        onPress={() => setRating(n)}
                        accessibilityRole="button"
                        accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                        accessibilityState={{ selected: n <= rating }}
                        style={{ width: MinTouch, height: MinTouch, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color={n <= rating ? colors.primary : colors.textMuted} />
                    </Pressable>
                ))}
            </View>

            <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Comparte tu experiencia (opcional)"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Comentario de la reseña"
                multiline
                numberOfLines={3}
                maxFontSizeMultiplier={1.3}
                style={{
                    backgroundColor: colors.backgroundElement,
                    borderRadius: Radius.xl,
                    padding: Spacing.three,
                    fontSize: 15,
                    fontFamily: Fonts.sans,
                    color: colors.text,
                    minHeight: 88,
                    textAlignVertical: 'top',
                    marginBottom: Spacing.three,
                }}
            />

            <View style={{ gap: Spacing.two }}>
                <Button label={submitLabel} onPress={handleSubmit} loading={submitting} disabled={rating === 0} />
                {allowSkip && onSkip ? <Button label="Omitir" onPress={onSkip} variant="secondary" /> : null}
                <Button label="Cancelar" onPress={onCancel} variant="ghost" />
            </View>
        </Sheet>
    );
}
