export type CartSource = "standard" | "advisory";

export type CartItem = {
  listingId: string;
  title: string;
  dailyPrice: number;
  quantity: number;
  providerId?: string;
  providerName?: string;
  coverImageUrl?: string | null;
};

export type CartState = {
  items: CartItem[];
  startDate: string | null;
  endDate: string | null;
  source: CartSource;
  proposalId: string | null;
  locked: boolean;
};

export type CartQuoteItem = {
  listingId: string;
  providerId: string;
  providerUserId: string;
  providerName: string;
  title: string;
  unitPrice: number;
  quantity: number;
  coverImageUrl: string | null;
  lineSubtotal: number;
};

export type CartQuote = {
  items: CartQuoteItem[];
  startDate: string;
  endDate: string;
  days: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  source: CartSource;
  proposalId: string | null;
  providerCount: number;
};

export type CartMutationResult =
  | { ok: true }
  | { ok: false; reason: "date_conflict" | "locked" };
