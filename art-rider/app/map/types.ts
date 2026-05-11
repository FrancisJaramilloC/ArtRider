// ── Tipos compartidos del módulo de mapa ────────────────────────────────────

export type MapListing = {
  id: string;
  title: string;
  category: string;
  daily_price: number;
  cover_image_url: string | null;
  address: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
  };
};
