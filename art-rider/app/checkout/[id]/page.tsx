import { getListingById } from "@/services/listingsService";
import { notFound, redirect } from "next/navigation";
import BookingFlowClient from "@/components/features/bookings/BookingFlowClient";
import { differenceInDays, parseISO } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout - ArtRider",
  description: "Proceso de pago seguro",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const listingId = resolvedParams.id;
  const startParam = resolvedSearchParams.start;
  const endParam = resolvedSearchParams.end;

  if (!startParam || !endParam) {
    redirect(`/listings/${listingId}`);
  }

  const listing = await getListingById(listingId);

  if (!listing) {
    notFound();
  }

  const startDateObj = parseISO(startParam);
  const endDateObj = parseISO(endParam);

  const days = Math.max(1, differenceInDays(endDateObj, startDateObj) + 1);
  const dailyPrice = listing.daily_price || 0;
  const totalAmount = days * dailyPrice;

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4">
        <BookingFlowClient
          listing={{
            id: listing.id,
            title: listing.title || "Equipo",
            description: listing.description || "",
            price_per_day: listing.daily_price,
            provider: { brand_name: listing.brand || "Proveedor" },
            cover_image_url: listing.cover_image_url || "",
          }}
          initialStart={startParam}
          initialEnd={endParam}
          priceCalc={{
            total: totalAmount,
            days,
            dailyPrice,
          }}
        />
      </div>
    </div>
  );
}
