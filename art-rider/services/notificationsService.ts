"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "booking_request"
  | "booking_confirmed"
  | "booking_cancelled"
  | "new_message"
  | "identity_verified"
  | "identity_rejected"
  | "review_received";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
};

import { cache } from "react";

//Operaciones para obtener notificaciones

export const getMyNotifications = cache(async function getMyNotifications(): Promise<AppNotification[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[notificationsService] getMyNotifications error:", error);
    return [];
  }
  return data as AppNotification[];
});

export const getUnreadCount = cache(async function getUnreadCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[notificationsService] getUnreadCount error:", error);
    return 0;
  }
  return count || 0;
});

//Operaciones para marcar notificaciones como leidas

export async function markAsRead(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Failed to mark as read" };

  revalidatePath("/notifications", "layout");
  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { error: "Failed to mark all as read" };

  revalidatePath("/notifications", "layout");
  return { success: true };
}

//Funcion para crear notificaciones

export async function createNotification(payload: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  metadata?: any;
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
    console.error("[notificationsService] createNotification error:", error);
    return { error: error.message };
  }

  return { success: true };
}
