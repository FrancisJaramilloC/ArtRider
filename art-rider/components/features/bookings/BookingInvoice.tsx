import Image from "next/image";
import { Info } from "lucide-react";

interface BookingInvoiceProps {
  listing: {
    title: string;
    cover_image_url?: string;
    provider: { brand_name?: string };
    category?: string;
  };
  priceCalc: {
    days: number;
    dailyPrice: number;
    subtotal: number;
    serviceFee: number;
    total: number;
  };
}

export function BookingInvoice({ listing, priceCalc }: BookingInvoiceProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl sticky top-28">
      {/* Listing Info */}
      <div className="flex gap-4 pb-6 border-b border-gray-200">
        <div className="relative w-24 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
          {listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-xs">Sin foto</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {listing.category || "Equipo"}
          </p>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {listing.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {listing.provider?.brand_name || "Proveedor"}
          </p>
        </div>
      </div>

      {/* Invoice Breakdown */}
      <div className="py-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Detalle del precio</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between text-gray-600">
            <span>${(priceCalc.dailyPrice / 100).toFixed(2)} x {priceCalc.days} {priceCalc.days === 1 ? 'día' : 'días'}</span>
            <span>${(priceCalc.subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="flex items-center gap-1 underline underline-offset-4 decoration-gray-300">
              Tarifa de servicio
            </span>
            <span>${(priceCalc.serviceFee / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
        <span className="text-base font-bold text-gray-900">Total (USD)</span>
        <span className="text-xl font-bold text-gray-900">${(priceCalc.total / 100).toFixed(2)}</span>
      </div>

      {/* Trust message */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl flex items-start gap-3 border border-gray-100">
        <Info className="w-5 h-5 text-[#875B9A] shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          No se te cobrará nada aún. Primero el proveedor debe confirmar la disponibilidad y firmar el contrato digital de alquiler.
        </p>
      </div>
    </div>
  );
}
