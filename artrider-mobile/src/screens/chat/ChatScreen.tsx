import { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    FlatList,
    TextInput,
    Pressable,
    Image,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { ThemedText } from '@/components/themed-text';
import { BackButton } from '@/components/navigation/BackButton';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase';
import {
    getMessages,
    sendMessage,
    markMessagesRead,
    subscribeToMessages,
    subscribeToTyping,
    broadcastTyping,
    subscribeToPresence,
    getConversationAboutItem,
    getOrCreateConversation,
    type Message,
    type ConversationAboutItem,
} from '@/services/messagesService';
import { getListingById } from '@/services/catalogService';
import { getPackageById } from '@/services/packagesService';

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

export function ChatScreen() {
    const {
        id: conversationId,
        otherName,
        providerId,
        listingId,
        packageId,
    } = useLocalSearchParams<{
        id: string;
        otherName?: string;
        providerId?: string;
        listingId?: string;
        packageId?: string;
    }>();
    const router = useRouter();
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
    const { session } = useAuth();
    const myUserId = session?.user?.id ?? '';

    // Modo borrador: la conversación todavía no existe en la base — nace
    // recién cuando se manda el primer mensaje (igual que Facebook Marketplace).
    const isDraft = conversationId === 'new';

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(!isDraft);
    const [text, setText] = useState('');
    const [otherTyping, setOtherTyping] = useState(false);
    const [otherOnline, setOtherOnline] = useState(false);
    const [sending, setSending] = useState(false);
    const [aboutItem, setAboutItem] = useState<ConversationAboutItem | null>(null);

    const typingChannelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Carga inicial + marcar leído (solo si ya existe conversación real)
    useEffect(() => {
        if (isDraft || !conversationId) return;
        getMessages(conversationId).then((msgs) => {
            setMessages(msgs);
            setLoading(false);
        });
        markMessagesRead(conversationId);
    }, [conversationId, isDraft]);

    // Chip del listing/paquete: si es borrador, lo resolvemos directo desde
    // los params (todavía no hay fila de conversación de la cual leerlo).
    useEffect(() => {
        if (isDraft) {
            if (listingId) {
                getListingById(listingId).then((l) => {
                    if (l) setAboutItem({ kind: 'listing', id: l.id, title: l.title, cover_image_url: l.cover_image_url, daily_price: l.daily_price });
                });
            } else if (packageId) {
                getPackageById(packageId).then((p) => {
                    if (p) setAboutItem({ kind: 'package', id: p.id, title: p.title, cover_image_url: p.cover_image_url, daily_price: p.daily_price });
                });
            }
            return;
        }
        if (!conversationId) return;
        getConversationAboutItem(conversationId).then(setAboutItem);
    }, [conversationId, isDraft, listingId, packageId]);

    // Suscripción a mensajes en tiempo real (solo con conversación real)
    useEffect(() => {
        if (isDraft || !conversationId) return;

        const channel = subscribeToMessages(
            conversationId,
            (newMessage) => {
                setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
                if (newMessage.sender_id !== myUserId) {
                    markMessagesRead(conversationId);
                }
            },
            (updatedMessage) => {
                setMessages((prev) => prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)));
            }
        );

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, isDraft, myUserId]);

    // Canal de "escribiendo..." (solo con conversación real)
    useEffect(() => {
        if (isDraft || !conversationId || !myUserId) return;
        const channel = subscribeToTyping(conversationId, myUserId, setOtherTyping);
        typingChannelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, isDraft, myUserId]);

    // Presencia (solo con conversación real)
    useEffect(() => {
        if (isDraft || !conversationId || !myUserId) return;
        const channel = subscribeToPresence(conversationId, myUserId, (onlineIds) => {
            setOtherOnline(onlineIds.some((id) => id !== myUserId));
        });
        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, isDraft, myUserId]);

    function handleTextChange(value: string) {
        setText(value);
        if (!typingChannelRef.current) return;

        broadcastTyping(typingChannelRef.current, myUserId, true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            broadcastTyping(typingChannelRef.current!, myUserId, false);
        }, 2000);
    }

    const handleSend = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        setSending(true);
        setText('');
        if (typingChannelRef.current) broadcastTyping(typingChannelRef.current, myUserId, false);

        try {
            if (isDraft) {
                // Recién ahora nace la conversación de verdad.
                if (!providerId) throw new Error('Falta providerId para crear la conversación');
                const realId = await getOrCreateConversation(providerId, listingId ?? null, packageId ?? null);
                await sendMessage(realId, trimmed);
                // Reemplaza la ruta por la del chat real — el próximo montaje
                // ya carga todo normal (mensajes, realtime, etc.)
                router.replace({
                    pathname: '/chat/[id]',
                    params: { id: realId, otherName: otherName ?? 'Proveedor' },
                });
            } else if (conversationId) {
                const sent = await sendMessage(conversationId, trimmed);
                setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
            }
        } catch (e) {
            console.error('[ChatScreen] handleSend:', e);
            setText(trimmed);
        } finally {
            setSending(false);
        }
    }, [text, sending, isDraft, providerId, listingId, packageId, conversationId, otherName, myUserId, router]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderBottomWidth: 1, borderColor: colors.border }}>
                <BackButton />
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text }}>
                        {otherName ?? 'Conversación'}
                    </ThemedText>
                    {!isDraft && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: otherOnline ? '#22c55e' : colors.textSecondary }} />
                            <ThemedText style={{ fontSize: 11, color: colors.textSecondary }}>
                                {otherTyping ? 'escribiendo...' : otherOnline ? 'en línea' : 'desconectado'}
                            </ThemedText>
                        </View>
                    )}
                </View>
            </View>

            {/* Chip minimalista del listing o paquete sobre el que se está hablando */}
            {aboutItem && (
                <Pressable
                    onPress={() =>
                        router.push(
                            (aboutItem.kind === 'listing' ? `/listing/${aboutItem.id}` : `/package/${aboutItem.id}`) as any
                        )
                    }
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.two,
                        paddingHorizontal: Spacing.four,
                        paddingVertical: Spacing.two,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.backgroundElement,
                    }}
                >
                    <View style={{ width: 30, height: 30, borderRadius: Radius.sm, overflow: 'hidden' }}>
                        {aboutItem.cover_image_url ? (
                            <Image source={{ uri: aboutItem.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                            <LinearGradient colors={['#875B9A', '#5c3569']} style={{ width: '100%', height: '100%' }} />
                        )}
                    </View>
                    <ThemedText numberOfLines={1} style={{ flex: 1, fontSize: 12.5, color: colors.textSecondary }}>
                        Sobre {aboutItem.kind === 'package' ? 'el paquete ' : ''}
                        <ThemedText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: colors.text }}>
                            {aboutItem.title ?? 'este item'}
                        </ThemedText>
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                </Pressable>
            )}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
                {isDraft ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four }}>
                        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                            Envía tu primer mensaje para iniciar la conversación
                        </ThemedText>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.two }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        renderItem={({ item }) => {
                            const isMine = item.sender_id === myUserId;
                            return (
                                <View style={{ alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                    <View
                                        style={{
                                            maxWidth: '78%',
                                            backgroundColor: isMine ? colors.primary : colors.backgroundElement,
                                            borderRadius: Radius.lg,
                                            borderBottomRightRadius: isMine ? 4 : Radius.lg,
                                            borderBottomLeftRadius: isMine ? Radius.lg : 4,
                                            paddingHorizontal: Spacing.three,
                                            paddingVertical: Spacing.two,
                                        }}
                                    >
                                        <ThemedText style={{ fontSize: 14, color: isMine ? '#fff' : colors.text }}>{item.content}</ThemedText>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                        <ThemedText style={{ fontSize: 10, color: colors.textSecondary }}>{formatTime(item.sent_at)}</ThemedText>
                                        {isMine && (
                                            <Ionicons
                                                name={item.read ? 'checkmark-done' : 'checkmark'}
                                                size={13}
                                                color={item.read ? colors.primary : colors.textSecondary}
                                            />
                                        )}
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}

                {/* Input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderTopWidth: 1, borderColor: colors.border }}>
                    <View style={{ flex: 1, backgroundColor: colors.backgroundElement, borderRadius: 999, paddingHorizontal: Spacing.three }}>
                        <TextInput
                            value={text}
                            onChangeText={handleTextChange}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            style={{ paddingVertical: 10, fontSize: 14, color: colors.text, fontFamily: 'Inter_400Regular', maxHeight: 100 }}
                        />
                    </View>
                    <Pressable
                        onPress={handleSend}
                        disabled={!text.trim() || sending}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: !text.trim() || sending ? colors.backgroundSelected : colors.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={colors.textSecondary} />
                        ) : (
                            <Ionicons name="send" size={17} color={!text.trim() ? colors.textSecondary : '#fff'} />
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}