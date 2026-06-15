"use server";

import { createSupabaseServerClient } from "@/lib/supabaseServer";

//  Tipos del catalogo
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

//  Obtiene todos los articulos del catalogo publicados (listings + packages) de la vista `catalog_items`
//  Retorna: una promesa que resuelve a un array de articulos del catalogo
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

//  Busca en el catalogo unificado con filtros opcionales
export async function searchCatalog(
  filters: CatalogFilters = {}
): Promise<CatalogItem[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("is_published", true);

  // Filtra por tipo
  if (filters.type) {
    query = query.eq("item_type", filters.type);
  }

  // Filtra por categoria (solo aplica a listings)
  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  // Filtra por rango de precios
  if (filters.minPrice !== undefined) {
    query = query.gte("daily_price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("daily_price", filters.maxPrice);
  }

  // Busqueda de texto en el titulo
  if (filters.query) {
    query = query.ilike("title", `%${filters.query}%`);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  //  Si hay un error, se lanza una excepcion
  if (error)
    throw new Error(`[catalogService] searchCatalog: ${error.message}`);
  //  Se retorna el array de articulos del catalogo
  return (data ?? []) as CatalogItem[];
}
