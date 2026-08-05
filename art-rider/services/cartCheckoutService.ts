"use server";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { CartItem, CartQuote, CartQuoteItem, CartSource } from "@/types/cart";

const STANDARD_SERVICE_FEE_RATE = 0.05;
const MAX_CART_LINES = 25;
const MAX_ITEM_QUANTITY = 20;

type QuoteInput = {
  items: Pick<CartItem, "listingId" | "quantity">[];
  startDate: string;
  endDate: string;
  proposalId?: string | null;
};

type ProposalItem = {
  listing_id: string;
  quantity: number;
  unit_price: number;
};

function normalizeDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha inválida.");
  return parsed.toISOString().slice(0, 10);
}

function countDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days < 1 || days > 365) throw new Error("El rango de fechas no es válido.");
  return days;
}

function aggregateItems(items: QuoteInput["items"]) {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_CART_LINES) {
    throw new Error("El carrito debe tener entre 1 y 25 equipos.");
  }
  const aggregate = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.listingId !== "string" || !item.listingId) {
      throw new Error("El carrito contiene un equipo inválido.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
      throw new Error("La cantidad de un equipo no es válida.");
    }
    aggregate.set(item.listingId, (aggregate.get(item.listingId) ?? 0) + item.quantity);
  }
  for (const quantity of aggregate.values()) {
    if (quantity > MAX_ITEM_QUANTITY) throw new Error("La cantidad máxima por equipo es 20.");
  }
  return aggregate;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function buildCartQuote(
  input: QuoteInput,
  userId?: string,
): Promise<CartQuote> {
  const admin = createSupabaseAdminClient();
  const startDate = normalizeDate(input.startDate);
  const endDate = normalizeDate(input.endDate);
  const days = countDays(startDate, endDate);
  let requested = aggregateItems(input.items);
  let source: CartSource = "standard";
  let proposalId: string | null = null;
  let advisoryPrices = new Map<string, number>();
  let advisorySubtotal: number | null = null;
  let advisoryFee: number | null = null;
  let advisoryTotal: number | null = null;

  if (input.proposalId) {
    if (!userId) throw new Error("Debes iniciar sesión para usar una propuesta Advisory.");
    const { data: proposal, error } = await admin
      .from("advisory_proposals")
      .select("id, items, subtotal, commission_amount, total, status, request:advisory_requests(client_id, event_date)")
      .eq("id", input.proposalId)
      .single();
    if (error || !proposal) throw new Error("La propuesta Advisory no existe.");

    const request = relationOne(proposal.request as { client_id: string; event_date: string | null } | { client_id: string; event_date: string | null }[]);
    if (!request || request.client_id !== userId) throw new Error("No tienes acceso a esta propuesta.");
    if (!['accepted', 'signed'].includes(proposal.status)) {
      throw new Error("La propuesta debe estar firmada antes del pago.");
    }
    const eventDate = request.event_date ? normalizeDate(request.event_date) : null;
    if (!eventDate || startDate !== eventDate || endDate !== eventDate) {
      throw new Error("Las fechas del carrito no coinciden con la fecha del evento.");
    }

    const proposalItems = (proposal.items ?? []) as ProposalItem[];
    const expected = aggregateItems(proposalItems.map((item) => ({
      listingId: item.listing_id,
      quantity: item.quantity,
    })));
    if (
      expected.size !== requested.size ||
      [...expected].some(([id, quantity]) => requested.get(id) !== quantity)
    ) {
      throw new Error("El carrito no coincide con el rider firmado.");
    }
    requested = expected;
    advisoryPrices = new Map(proposalItems.map((item) => [item.listing_id, item.unit_price]));
    advisorySubtotal = proposal.subtotal;
    advisoryFee = proposal.commission_amount;
    advisoryTotal = proposal.total;
    source = "advisory";
    proposalId = proposal.id;
  }

  const listingIds = [...requested.keys()];
  const { data: listings, error: listingsError } = await admin
    .from("listings")
    .select("id, title, daily_price, cover_image_url, provider_id, is_published, deleted_at, provider:providers(id, user_id, brand_name)")
    .in("id", listingIds);
  if (listingsError) throw new Error("No se pudo validar el catálogo.");
  if (!listings || listings.length !== listingIds.length) {
    throw new Error("Uno o más equipos ya no existen.");
  }

  const { data: units, error: unitsError } = await admin
    .from("equipment_units")
    .select("id, listing_id")
    .in("listing_id", listingIds)
    .eq("internal_status", "AVAILABLE");
  if (unitsError) throw new Error("No se pudo validar el inventario.");

  const unitIds = (units ?? []).map((unit) => unit.id);
  const [bookingUnitsResult, calendarResult] = unitIds.length
    ? await Promise.all([
        admin
          .from("booking_units")
          .select("equipment_unit_id, booking:bookings(start_date, end_date, status)")
          .in("equipment_unit_id", unitIds),
        admin
          .from("availability_calendar")
          .select("equipment_unit_id, start_date, end_date")
          .in("equipment_unit_id", unitIds)
          .lte("start_date", endDate)
          .gte("end_date", startDate),
      ])
    : [{ data: [] }, { data: [] }];

  const blockedUnitIds = new Set<string>();
  for (const row of bookingUnitsResult.data ?? []) {
    const booking = relationOne(row.booking as { start_date: string; end_date: string; status: string } | { start_date: string; end_date: string; status: string }[]);
    if (
      booking &&
      !["CANCELLED", "ARCHIVED"].includes(booking.status) &&
      booking.start_date <= endDate &&
      booking.end_date >= startDate
    ) blockedUnitIds.add(row.equipment_unit_id);
  }
  for (const row of calendarResult.data ?? []) blockedUnitIds.add(row.equipment_unit_id);

  const quoteItems: CartQuoteItem[] = listings.map((listing) => {
    if (!listing.is_published || listing.deleted_at) throw new Error(`${listing.title ?? "Un equipo"} ya no está publicado.`);
    const provider = relationOne(listing.provider as { id: string; user_id: string; brand_name: string | null } | { id: string; user_id: string; brand_name: string | null }[]);
    if (!provider) throw new Error("Un equipo no tiene proveedor válido.");
    if (userId && provider.user_id === userId) throw new Error("No puedes reservar tus propios equipos.");

    const quantity = requested.get(listing.id) ?? 0;
    const available = (units ?? []).filter(
      (unit) => unit.listing_id === listing.id && !blockedUnitIds.has(unit.id),
    ).length;
    if (available < quantity) {
      throw new Error(`${listing.title ?? "Un equipo"} solo tiene ${available} unidad(es) disponible(s).`);
    }

    const unitPrice = source === "advisory"
      ? advisoryPrices.get(listing.id) ?? listing.daily_price
      : listing.daily_price;
    return {
      listingId: listing.id,
      providerId: listing.provider_id,
      providerUserId: provider.user_id,
      providerName: provider.brand_name || "Proveedor",
      title: listing.title || "Equipo",
      unitPrice,
      quantity,
      coverImageUrl: listing.cover_image_url,
      lineSubtotal: unitPrice * quantity * days,
    };
  });

  quoteItems.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.title.localeCompare(b.title));
  const subtotal = quoteItems.reduce((total, item) => total + item.lineSubtotal, 0);
  const serviceFee = source === "advisory"
    ? advisoryFee ?? 0
    : Math.round(subtotal * STANDARD_SERVICE_FEE_RATE);
  const total = subtotal + serviceFee;

  if (
    source === "advisory" &&
    (subtotal !== advisorySubtotal || total !== advisoryTotal)
  ) throw new Error("Los valores del rider firmado no coinciden con la propuesta.");

  return {
    items: quoteItems,
    startDate,
    endDate,
    days,
    subtotal,
    serviceFee,
    total,
    source,
    proposalId,
    providerCount: new Set(quoteItems.map((item) => item.providerId)).size,
  };
}

export async function createMultiProviderOrder(
  quote: CartQuote,
  userId: string,
  kushkiTicket: string,
) {
  const admin = createSupabaseAdminClient();
  const rpcItems = quote.items.map((item) => ({
    listing_id: item.listingId,
    provider_id: item.providerId,
    title: item.title,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_subtotal: item.lineSubtotal,
    cover_image_url: item.coverImageUrl,
    provider_name: item.providerName,
  }));

  const { data, error } = await admin.rpc("create_multi_provider_checkout", {
    p_client_id: userId,
    p_kushki_ticket: kushkiTicket,
    p_source: quote.source,
    p_advisory_proposal_id: quote.proposalId,
    p_start_date: quote.startDate,
    p_end_date: quote.endDate,
    p_subtotal: quote.subtotal,
    p_service_fee: quote.serviceFee,
    p_total: quote.total,
    p_items: rpcItems,
  });
  if (error) throw new Error(error.message);

  const result = data as { order_id: string; booking_ids: string[] };
  if (!result?.order_id || !Array.isArray(result.booking_ids)) {
    throw new Error("La base de datos no devolvió la orden creada.");
  }
  return { orderId: result.order_id, bookingIds: result.booking_ids };
}
