"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type ConversationSummary = {
    id: string;
    listing_id: string | null;
    package_id: string | null;
    booking_id: string | null;
    client_id: string | null;
    provider_id: string | null;
    created_at: string;
    other_name: string;
    other_avatar_url?: string | null;
    equipment_title: string | null;
    cover_image_url: string | null;
    listing_city: string | null;
    last_message_text: string | null;
    last_message_time: string | null;
    last_message_is_mine: boolean;
    unread_count: number;
    booking_start_date: string | null;
    booking_end_date: string | null;
    booking_total: number | null;
    is_archived: boolean;
};

export type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read: boolean;
    sent_at: string;
};

export async function getConversations(): Promise<ConversationSummary[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_my_conversations');

    if (error) {
        console.error('[messagesService] getConversations:', error.message);
        return [];
    }

    return (data ?? []) as ConversationSummary[];
}

export async function getMessages(conversationId: string): Promise<Message[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, read, sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });

    if (error) {
        console.error('[messagesService] getMessages:', error.message);
        return [];
    }

    return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            content,
            sender_id: user.id,
            read: false,
            sent_at: new Date().toISOString(),
        })
        .select('id, conversation_id, sender_id, content, read, sent_at')
        .single();

    if (error) throw error;
    return data as Message;
}

export async function markMessagesRead(conversationId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('mark_messages_read', {
        p_conversation_id: conversationId,
    });

    if (error) {
        console.error('[messagesService] markMessagesRead:', error.message);
    }
}

export async function getOrCreateConversation(
  providerId: string,
  listingId?: string | null,
  packageId?: string | null
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_provider_id: providerId,
    p_listing_id: listingId ?? null,
    p_package_id: packageId ?? null,
  });

  if (error) throw error;
  return data as string;
}

export type ConversationAboutItem = {
  kind: 'listing' | 'package';
  id: string;
  title: string | null;
  cover_image_url: string | null;
  daily_price: number;
};

export async function getConversationAboutItem(
  conversationId: string
): Promise<ConversationAboutItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      listing_id,
      package_id,
      listing:listings(id, title, cover_image_url, daily_price),
      package:packages(id, title, cover_image_url, daily_price)
    `)
    .eq('id', conversationId)
    .single();

  if (error || !data) return null;

  const listing = Array.isArray((data as any).listing) ? (data as any).listing[0] : (data as any).listing;
  const pkg = Array.isArray((data as any).package) ? (data as any).package[0] : (data as any).package;

  if (data.listing_id && listing) {
    return { kind: 'listing', id: listing.id, title: listing.title, cover_image_url: listing.cover_image_url, daily_price: listing.daily_price };
  }
  if (data.package_id && pkg) {
    return { kind: 'package', id: pkg.id, title: pkg.title, cover_image_url: pkg.cover_image_url, daily_price: pkg.daily_price };
  }
  return null;
}

export async function findExistingConversation(
  providerId: string,
  listingId?: string | null,
  packageId?: string | null
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('conversations').select('id').eq('provider_id', providerId);
  query = listingId ? query.eq('listing_id', listingId) : query.is('listing_id', null);
  query = packageId ? query.eq('package_id', packageId) : query.is('package_id', null);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function archiveConversation(conversationId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_archived')
        .insert({ user_id: user.id, conversation_id: conversationId });

    if (error) console.error('[messagesService] archiveConversation:', error.message);
}

export async function unarchiveConversation(conversationId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_archived')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

    if (error) console.error('[messagesService] unarchiveConversation:', error.message);
}

export async function deleteConversationForMe(conversationId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('conversation_deleted')
        .insert({ user_id: user.id, conversation_id: conversationId });

    if (error) console.error('[messagesService] deleteConversationForMe:', error.message);
}
