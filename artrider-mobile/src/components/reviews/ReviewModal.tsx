import { useState } from 'react';
import { View, Modal, TextInput, Pressable, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';

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
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
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
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.five }}>
                <View style={{ backgroundColor: colors.background, borderRadius: Radius.lg, padding: Spacing.four, width: '100%' }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text, marginBottom: 4 }}>
                        {title}
                    </ThemedText>
                    {subtitle && (
                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.four }}>
                            {subtitle}
                        </ThemedText>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, marginBottom: Spacing.four }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                                <Ionicons
                                    name={n <= rating ? 'star' : 'star-outline'}
                                    size={32}
                                    color={n <= rating ? colors.primary : colors.textSecondary}
                                />
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        value={comment}
                        onChangeText={setComment}
                        placeholder="Comparte tu experiencia (opcional)"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={3}
                        style={{
                            backgroundColor: colors.backgroundElement,
                            borderRadius: Radius.md,
                            padding: Spacing.three,
                            fontSize: 14,
                            color: colors.text,
                            minHeight: 70,
                            textAlignVertical: 'top',
                            marginBottom: Spacing.four,
                        }}
                    />

                    <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        <Pressable
                            onPress={onCancel}
                            style={{ flex: 1, paddingVertical: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                        >
                            <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: colors.text }}>Cancelar</ThemedText>
                        </Pressable>
                        {allowSkip && onSkip && (
                            <Pressable
                                onPress={onSkip}
                                style={{ flex: 1, paddingVertical: Spacing.three, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                            >
                                <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13.5, color: colors.text }}>Omitir</ThemedText>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={handleSubmit}
                            disabled={rating === 0 || submitting}
                            style={{ flex: 1, paddingVertical: Spacing.three, borderRadius: Radius.md, backgroundColor: rating === 0 ? colors.backgroundSelected : colors.primary, alignItems: 'center' }}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 13.5, color: rating === 0 ? colors.textSecondary : '#fff' }}>
                                    {submitLabel}
                                </ThemedText>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}