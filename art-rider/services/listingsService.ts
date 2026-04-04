/**
 * listingsService.ts
 *
 * Service layer for all Supabase queries related to the Listings domain.
 *
 * Rules:
 *  - All functions use `createSupabaseServerClient()` (cookie-based SSR client).
 *  - Only published, non-deleted listings are returned to the public.
 *  - No transactional logic (bookings, payments) lives here — see bookingsService.
 *  - Errors are thrown with descriptive messages; callers decide how to handle them.
 */

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { CatalogProduct, ListingAddress, ListingWithRelations } from "@/types/listings";

// ---------------------------------------------------------------------------
// Internal: raw shape returned by the Supabase JS client
// ---------------------------------------------------------------------------
// The Supabase client types foreign-table joins as arrays (T[] | null) even
// when the FK is a many-to-one relationship. We define the raw shape here so
// TypeScript is satisfied, then normalize to our clean ListingWithRelations.

type RawCatalogRow = {
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
};

type RawAddressRow = {
  city: string;
  state: string;
  country: string;
};

type RawListingRow = {
  id: string;
  daily_price: number;
  description: string | null;
  is_published: boolean;
  created_at: string;
  product_catalog: RawCatalogRow[] | RawCatalogRow | null;
  addresses: RawAddressRow[] | RawAddressRow | null;
};

// ---------------------------------------------------------------------------
// Internal: normalizer
// ---------------------------------------------------------------------------

/**
 * Normalizes a raw Supabase row into a clean ListingWithRelations.
 * Handles the case where joined rows may come back as an array (Supabase SDK quirk).
 */
function normalize(raw: RawListingRow): ListingWithRelations {
  const catalog = Array.isArray(raw.product_catalog)
    ? (raw.product_catalog[0] as CatalogProduct | undefined) ?? null
    : (raw.product_catalog as CatalogProduct | null);

  const address = Array.isArray(raw.addresses)
    ? (raw.addresses[0] as ListingAddress | undefined) ?? null
    : (raw.addresses as ListingAddress | null);

  return {
    id: raw.id,
    daily_price: raw.daily_price,
    description: raw.description,
    is_published: raw.is_published,
    created_at: raw.created_at,
    product_catalog: catalog,
    addresses: address,
  };
}

// ---------------------------------------------------------------------------
// Internal: shared select string
// ---------------------------------------------------------------------------

/**
 * The Supabase select string for a listing with its catalog and address joins.
 * Kept as a constant so both query functions stay in sync.
 */
const LISTING_SELECT = `
  id,
  daily_price,
  description,
  is_published,
  created_at,
  product_catalog (
    name,
    brand,
    model,
    category
  ),
  addresses (
    city,
    state,
    country
  )
` as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches all published, non-deleted listings ordered by newest first.
 *
 * Access:  Fully public — relies on the RLS policy:
 *          `USING (is_published = true OR auth.uid() = owner_id)`
 *          Anonymous users will only receive rows where is_published = true.
 *
 * @returns An array of listings with catalog and address data.
 * @throws  Error with a descriptive message if the Supabase query fails.
 */
export async function getListings(): Promise<ListingWithRelations[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `[listingsService] getListings() failed: ${error.message} (code: ${error.code})`
    );
  }

  return ((data ?? []) as RawListingRow[]).map(normalize);
}

/**
 * Fetches a single published, non-deleted listing by its UUID.
 *
 * Access:  Fully public — same RLS policy as getListings().
 *          If the listing exists but is not published, `null` is returned
 *          (the caller should invoke `notFound()` from next/navigation).
 *
 * @param   id — UUID of the listing to fetch.
 * @returns The listing with catalog and address data, or `null` if not found.
 * @throws  Error with a descriptive message if the Supabase query fails.
 */
export async function getListingById(
  id: string
): Promise<ListingWithRelations | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error) {
    // PostgREST returns code PGRST116 when `.single()` finds no rows.
    // This is a "not found" case, not an infrastructure failure — return null.
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(
      `[listingsService] getListingById(${id}) failed: ${error.message} (code: ${error.code})`
    );
  }

  return normalize(data as RawListingRow);
}
