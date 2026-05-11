"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CatalogItem = {
  id: string;
  item_type: "listing" | "package";
  provider_id: string;
  title: string | null;
  category: string | null;
  cover_image_url: string | null;
  daily_price: number;
  description: string | null;
  is_published: boolean;
  created_at: string;
};

export type CatalogFilters = {
  query?: string;
  type?: "listing" | "package";
  category?: string;
  minPrice?: number;
  maxPrice?: number;
};

// ── Read (Public) ──────────────────────────────────────────────────────────────

/**
 * Fetches all published catalog items (listings + packages) from the
 * unified `catalog_items` view.
 */
export async function getCatalogItems(): Promise<CatalogItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error)
    throw new Error(`[catalogService] getCatalogItems: ${error.message}`);
  return (data ?? []) as CatalogItem[];
}

/**
 * Searches the unified catalog with optional filters.
 */
export async function searchCatalog(
  filters: CatalogFilters = {}
): Promise<CatalogItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("is_published", true);

  // Filter by type
  if (filters.type) {
    query = query.eq("item_type", filters.type);
  }

  // Filter by category (only applies to listings)
  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  // Filter by price range
  if (filters.minPrice !== undefined) {
    query = query.gte("daily_price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("daily_price", filters.maxPrice);
  }

  // Text search on title
  if (filters.query) {
    query = query.ilike("title", `%${filters.query}%`);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error)
    throw new Error(`[catalogService] searchCatalog: ${error.message}`);
  return (data ?? []) as CatalogItem[];
}
