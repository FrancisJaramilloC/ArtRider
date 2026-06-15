//  Tipos de TS para el dominio de Listings.
/**
 * Shared TypeScript types for the Listings domain.
 *
 * These types mirror the exact shape returned by Supabase when querying
 * the `listings` table with LEFT JOINs on `product_catalog` and `addresses`.
 * They are intentionally kept as plain data types (no classes, no methods)
 * so they can be safely passed from Server Components to Client Components.
 */

// ---------------------------------------------------------------------------
// Sub-shapes returned by Supabase JOIN columns
// ---------------------------------------------------------------------------

export type CatalogProduct = {
  /** Display name of the product (e.g. "Pioneer DJ CDJ-3000") */
  name: string;
  /** Manufacturer brand (e.g. "Pioneer DJ") */
  brand: string | null;
  /** Model identifier (e.g. "CDJ-3000") */
  model: string | null;
  /** Broad category (e.g. "Audio", "Lighting", "Instruments") */
  category: string | null;
};

export type ListingAddress = {
  /** City where the equipment is physically located */
  city: string;
  /** State / province */
  state: string;
  /** Country (full name, e.g. "Colombia") */
  country: string;
};

// ---------------------------------------------------------------------------
// Primary listing shape (used in both catalog list & detail view)
// ---------------------------------------------------------------------------

export type ListingWithRelations = {
  /** UUID primary key of the listing */
  id: string;
  /**
   * Rental price per day, stored as an integer in the smallest currency unit
   * (e.g. cents). Format for display: `daily_price / 100`.
   */
  daily_price: number;
  /** Owner-written description of the listing (may be null) */
  description: string | null;
  /** Whether this listing is publicly visible */
  is_published: boolean;
  /** ISO 8601 timestamp — used for default sort order */
  created_at: string;
  /**
   * Joined product catalog row.
   * null if catalog_item_id is orphaned (should not happen in practice).
   */
  product_catalog: CatalogProduct | null;
  /**
   * Joined address row.
   * null if address_id is orphaned (should not happen in practice).
   */
  addresses: ListingAddress | null;
};
