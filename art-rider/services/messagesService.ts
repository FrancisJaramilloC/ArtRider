"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// Admin client (bypasses RLS)
// ─────────────────────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseAdminClient(url, key);
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type ConversationSummary = {
  id: string;
  listing_id: string | null;
  booking_id: string | null;
  client_id: string | null;
  provider_id: string | null;
  status: string;
  created_at: string;
  // computed
  other_name: string;
  other_initials: string;
  other_color: string;
  equipment_title: string;
  cover_image_url: string | null;
  last_message_text: string;
  last_message_time: string;
  last_message_is_mine: boolean;
  unread_count: number;
  is_archived: boolean;
  // booking
  booking_dates: string | null;
  booking_total: number | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const COLORS = [
  "#7c3aed",
  "#db2f8e",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#9333ea",
  "#dc2626",
];

function idToColor(id: string): string {
  return COLORS[id.charCodeAt(0) % COLORS.length];
}

function toInitials(name: string): string {
  return name.trim().substring(0, 2).toUpperCase();
}

const SPANISH_DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const SPANISH_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const daysDiff = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 7) {
    return SPANISH_DAYS[date.getDay()];
  }

  return `${date.getDate()} ${SPANISH_MONTHS[date.getMonth()]}`;
}

function formatBookingDates(
  startDate: string | null,
  endDate: string | null
): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const year = start.getFullYear();
  const startStr = `${start.getDate()} ${SPANISH_MONTHS[start.getMonth()]}`;
  if (!end) return `${startStr} ${year}`;
  const endStr = `${end.getDate()} ${SPANISH_MONTHS[end.getMonth()]}`;
  return `${startStr} – ${endStr} ${year}`;
}

// ─────────────────────────────────────────────
// 1. getConversations
// ─────────────────────────────────────────────
export async function getConversations(
  userId: string
): Promise<ConversationSummary[]> {
  try {
    const admin = getAdminClient();

    // Fetch base conversations for this user
    const { data: rawConvos, error: convosError } = await admin
      .from("conversations")
      .select(
        `
        id,
        listing_id,
        booking_id,
        client_id,
        provider_id,
        status,
        created_at
      `
      )
      .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (convosError) throw convosError;
    if (!rawConvos || rawConvos.length === 0) return [];

    // Fetch deleted and archived sets for this user
    const [deletedRes, archivedRes] = await Promise.all([
      admin
        .from("conversation_deleted")
        .select("conversation_id")
        .eq("user_id", userId),
      admin
        .from("conversation_archived")
        .select("conversation_id")
        .eq("user_id", userId),
    ]);

    const deletedIds = new Set(
      (deletedRes.data ?? []).map((r: { conversation_id: string }) => r.conversation_id)
    );
    const archivedIds = new Set(
      (archivedRes.data ?? []).map((r: { conversation_id: string }) => r.conversation_id)
    );

    // Filter out deleted
    const visibleConvos = rawConvos.filter(
      (c: { id: string }) => !deletedIds.has(c.id)
    );

    // For each conversation enrich in parallel
    const enriched = await Promise.all(
      visibleConvos.map(async (convo: {
        id: string;
        listing_id: string | null;
        booking_id: string | null;
        client_id: string | null;
        provider_id: string | null;
        status: string;
        created_at: string;
      }) => {
        const isClient = convo.client_id === userId;

        // Fetch other party name
        let otherName = "Usuario";
        try {
          if (isClient) {
            // Current user is client → get provider brand_name or full_name
            if (convo.provider_id) {
              const { data: providerRow } = await admin
                .from("providers")
                .select("brand_name, user_id")
                .eq("id", convo.provider_id)
                .single();

              if (providerRow) {
                if (providerRow.brand_name) {
                  otherName = providerRow.brand_name;
                } else if (providerRow.user_id) {
                  const { data: profileRow } = await admin
                    .from("profiles")
                    .select("full_name")
                    .eq("id", providerRow.user_id)
                    .single();
                  if (profileRow?.full_name) otherName = profileRow.full_name;
                }
              }
            }
          } else {
            // Current user is provider → get client full_name
            if (convo.client_id) {
              const { data: profileRow } = await admin
                .from("profiles")
                .select("full_name")
                .eq("id", convo.client_id)
                .single();
              if (profileRow?.full_name) otherName = profileRow.full_name;
            }
          }
        } catch {
          // keep default
        }

        // Fetch listing info
        let equipmentTitle = "";
        let coverImageUrl: string | null = null;
        if (convo.listing_id) {
          try {
            const { data: listingRow } = await admin
              .from("listings")
              .select("title, cover_image_url")
              .eq("id", convo.listing_id)
              .single();
            if (listingRow) {
              equipmentTitle = listingRow.title ?? "";
              coverImageUrl = listingRow.cover_image_url ?? null;
            }
          } catch {
            // keep defaults
          }
        }

        // Fetch last message
        let lastMessageText = "";
        let lastMessageTime = "";
        let lastMessageIsMine = false;
        let unreadCount = 0;
        try {
          const { data: msgs } = await admin
            .from("messages")
            .select("id, sender_id, content, read, created_at")
            .eq("conversation_id", convo.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (msgs && msgs.length > 0) {
            const last = msgs[0];
            lastMessageText = last.content ?? "";
            lastMessageTime = formatMessageTime(last.created_at);
            lastMessageIsMine = last.sender_id === userId;
          }

          // Count unread messages sent by the OTHER party
          const { count } = await admin
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", convo.id)
            .eq("read", false)
            .neq("sender_id", userId);

          unreadCount = count ?? 0;
        } catch {
          // keep defaults
        }

        // Fetch booking dates/total if booking_id exists
        let bookingDates: string | null = null;
        let bookingTotal: number | null = null;
        if (convo.booking_id) {
          try {
            const { data: bookingRow } = await admin
              .from("bookings")
              .select("start_date, end_date, total_price")
              .eq("id", convo.booking_id)
              .single();
            if (bookingRow) {
              bookingDates = formatBookingDates(
                bookingRow.start_date,
                bookingRow.end_date
              );
              bookingTotal = bookingRow.total_price ?? null;
            }
          } catch {
            // keep defaults
          }
        }

        const summary: ConversationSummary = {
          id: convo.id,
          listing_id: convo.listing_id,
          booking_id: convo.booking_id,
          client_id: convo.client_id,
          provider_id: convo.provider_id,
          status: convo.status,
          created_at: convo.created_at,
          other_name: otherName,
          other_initials: toInitials(otherName),
          other_color: idToColor(convo.id),
          equipment_title: equipmentTitle,
          cover_image_url: coverImageUrl,
          last_message_text: lastMessageText,
          last_message_time: lastMessageTime,
          last_message_is_mine: lastMessageIsMine,
          unread_count: unreadCount,
          is_archived: archivedIds.has(convo.id),
          booking_dates: bookingDates,
          booking_total: bookingTotal,
        };

        return summary;
      })
    );

    // Sort by last message time desc (use created_at as fallback)
    enriched.sort((a, b) => {
      const aTime = a.last_message_time || a.created_at;
      const bTime = b.last_message_time || b.created_at;
      return bTime > aTime ? 1 : -1;
    });

    return enriched;
  } catch (err) {
    console.error("[getConversations] error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────
// 2. getMessages
// ─────────────────────────────────────────────
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, read, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data as Message[]) ?? [];
  } catch (err) {
    console.error("[getMessages] error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────
// 3. sendMessage
// ─────────────────────────────────────────────
export async function sendMessage(
  conversationId: string,
  content: string,
  senderId: string
): Promise<Message> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      content,
      sender_id: senderId,
      read: false,
      sent_at: new Date().toISOString(),
    })
    .select("id, conversation_id, sender_id, content, read, created_at")
    .single();

  if (error) throw error;
  return data as Message;
}

// ─────────────────────────────────────────────
// 4. markMessagesRead
// ─────────────────────────────────────────────
export async function markMessagesRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .eq("read", false);
  } catch (err) {
    console.error("[markMessagesRead] error:", err);
  }
}

// ─────────────────────────────────────────────
// 5. softDeleteConversation
// ─────────────────────────────────────────────
export async function softDeleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("conversation_deleted")
    .insert({ conversation_id: conversationId, user_id: userId });
  if (error) throw error;
}

// ─────────────────────────────────────────────
// 6. archiveConversation
// ─────────────────────────────────────────────
export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("conversation_archived")
    .insert({ conversation_id: conversationId, user_id: userId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

// ─────────────────────────────────────────────
// 7. unarchiveConversation
// ─────────────────────────────────────────────
export async function unarchiveConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("conversation_archived")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}
