import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { NotificationType } from "@/services/notificationsService";

/**
 * Inserts a notification for any user using the admin client (bypasses RLS).
 * Server-only on purpose: it must never be exposed as a public Server Action,
 * otherwise anyone could forge notifications for arbitrary users.
 */
export async function createNotification(payload: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("notifications").insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    href: payload.href || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    console.error("[notificationsServer] createNotification error:", error);
    return { error: error.message };
  }

  return { success: true };
}
