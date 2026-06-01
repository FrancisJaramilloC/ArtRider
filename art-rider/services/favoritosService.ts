"use server";

// Schema de la tabla en Supabase:
// create table favorites (
//   id uuid default gen_random_uuid() primary key,
//   usuario_id uuid references auth.users(id) on delete cascade,
//   item_id uuid not null,          -- puede ser listing_id O package_id
//   tipo text check (tipo in ('equipo', 'paquete')),
//   created_at timestamptz default now(),
//   unique(usuario_id, item_id, tipo)
// );

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export type FavoritoTipo = "equipo" | "paquete";

export async function getUserFavIds(): Promise<{ equipoIds: string[]; paqueteIds: string[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { equipoIds: [], paqueteIds: [] };

    const { data } = await supabase
      .from("favorites")
      .select("item_id, tipo")
      .eq("usuario_id", user.id);

    const rows = data ?? [];
    return {
      equipoIds:  rows.filter(r => r.tipo === "equipo").map(r => r.item_id),
      paqueteIds: rows.filter(r => r.tipo === "paquete").map(r => r.item_id),
    };
  } catch {
    return { equipoIds: [], paqueteIds: [] };
  }
}

export async function toggleFavorito(
  itemId: string,
  tipo: FavoritoTipo,
): Promise<{ esFavorito: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { esFavorito: false, error: "not_authenticated" };

    // Delete-first: avoids SELECT (which can be blocked by RLS) and properly
    // surfaces errors instead of returning false even when the delete failed.
    const { count: deleted, error: delErr } = await supabase
      .from("favorites")
      .delete({ count: "exact" })
      .eq("usuario_id", user.id)
      .eq("item_id", itemId)
      .eq("tipo", tipo);

    if (delErr) throw delErr;

    if (deleted && deleted > 0) {
      return { esFavorito: false };
    }

    const { error: insErr } = await supabase
      .from("favorites")
      .insert({ usuario_id: user.id, item_id: itemId, tipo });

    if (insErr) throw insErr;
    return { esFavorito: true };
  } catch (e: any) {
    console.error("[favoritosService] toggleFavorito:", e.message);
    return { esFavorito: false, error: e.message };
  }
}

export async function getFavoritosEquipos() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: favRows } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("usuario_id", user.id)
      .eq("tipo", "equipo");

    if (!favRows?.length) return [];
    const ids = favRows.map(r => r.item_id);

    const admin = createSupabaseAdminClient();
    const { data: listings } = await admin
      .from("listings")
      .select("id, title, category, cover_image_url, daily_price, address:addresses(city)")
      .in("id", ids)
      .eq("is_published", true)
      .is("deleted_at", null);

    return (listings ?? []).map((l: any) => {
      const addr = Array.isArray(l.address) ? l.address[0] : l.address;
      return { ...l, city: addr?.city ?? "Ecuador" };
    });
  } catch {
    return [];
  }
}

export async function getFavoritosPaquetes() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: favRows } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("usuario_id", user.id)
      .eq("tipo", "paquete");

    if (!favRows?.length) return [];
    const ids = favRows.map(r => r.item_id);

    const admin = createSupabaseAdminClient();
    const { data: packages } = await admin
      .from("packages")
      .select("id, title, cover_image_url, daily_price")
      .in("id", ids)
      .eq("is_published", true)
      .is("deleted_at", null);

    return (packages ?? []).map((p: any) => ({
      ...p,
      category: "paquete",
      city: "Ecuador",
    }));
  } catch {
    return [];
  }
}
