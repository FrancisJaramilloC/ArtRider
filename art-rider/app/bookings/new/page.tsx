import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { calculateBookingPrice } from "@/services/bookingsService";
import { BookingInvoice } from "@/components/features/bookings/BookingInvoice";
import { ConfirmBookingButton } from "@/components/features/bookings/ConfirmBookingButton";

interface PageProps {
  searchParams: {
    listing?: string;
    start?: string;
    end?: string;
  };
}

export default async function NewBookingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { listing: listingId, start, end } = params;

  if (!listingId || !start || !end) {
    redirect("/explore");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/bookings/new?listing=${listingId}&start=${start}&end=${end}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("*, provider:providers(brand_name)")
    .eq("id", listingId)
    .single();

  if (!listing) redirect("/explore");

  const priceCalc = await calculateBookingPrice(listingId, start, end);
  if ("error" in priceCalc) {
    redirect(`/listings/${listingId}`);
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  return (
    <main className="min-h-screen bg-white py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10">
          <Link
            href={`/listings/${listingId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-[#875B9A] transition-colors bg-gray-50 hover:bg-gray-100 p-2 pr-4 rounded-full"
          >
            <div className="bg-white p-1 rounded-full shadow-sm">
              <ChevronLeft className="w-4 h-4" />
            </div>
            Volver al equipo
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-8 mb-2">
            Confirma y reserva
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-24 items-start">
          {/* Left Column - Details */}
          <div className="min-w-0">
            {/* Fechas */}
            <section className="pb-8 mb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tu reserva</h2>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">Fechas</h3>
                  <p className="text-gray-600 mt-1">
                    {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM yyyy", { locale: es })}
                  </p>
                </div>
                <Link
                  href={`/listings/${listingId}`}
                  className="font-semibold underline text-gray-900 hover:text-[#875B9A]"
                >
                  Editar
                </Link>
              </div>
            </section>

            {/* Reglas de cancelación */}
            <section className="pb-8 mb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Política de cancelación</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                <span className="font-bold text-gray-900">Cancelación gratuita durante 48 horas.</span> Después, cancela antes del check-in para obtener un reembolso parcial.
              </p>
              <button className="font-semibold underline text-gray-900 hover:text-[#875B9A]">
                Mostrar más
              </button>
            </section>

            {/* Reglas fundamentales */}
            <section className="pb-8 mb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Reglas fundamentales</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Pedimos a todos los clientes que recuerden unas sencillas reglas para que ArtRider sea una gran plataforma para todos.
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>Sigue las reglas del proveedor</li>
                <li>Trata el equipo como si fuera tuyo</li>
              </ul>
            </section>

            {/* Confirm Button */}
            <section className="pt-4 pb-12">
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Al hacer clic en el botón siguiente, aceptas las Reglas del proveedor, las Reglas fundamentales para los clientes y que ArtRider te cobre cuando el proveedor confirme la reserva.
              </p>
              <ConfirmBookingButton
                listingId={listingId}
                start={start}
                end={end}
              />
            </section>
          </div>

          {/* Right Column - Invoice */}
          <div className="hidden lg:block relative">
            <BookingInvoice
              listing={listing as any}
              priceCalc={priceCalc as any}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
