"use client";

import { useState } from "react";
import { User, Phone, MapPin, Calendar } from "lucide-react";

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<"activas" | "archivo">("activas");

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight">Mis Reservas</h1>
        <p className="text-[0.95rem] text-gray-500 mt-1 font-medium">
          Gestiona el estado de tus alquileres y solicitudes.
        </p>
      </div>

      {/* ── Main Tabs ── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            className="border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 whitespace-nowrap border-b-[3px] py-3 px-1 text-[0.95rem] font-semibold transition-colors"
          >
            Solicitudes Recibidas (Vendo)
          </button>
          <button
            className="border-[#875B9A] text-[#875B9A] whitespace-nowrap border-b-[3px] py-3 px-1 text-[0.95rem] font-bold"
            aria-current="page"
          >
            Mis Alquileres (Compro)
          </button>
        </nav>
      </div>

      {/* ── Sub-filters (Pills) ── */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setActiveTab("activas")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
            activeTab === "activas" 
              ? "bg-gray-900 text-white shadow-md scale-100" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 scale-95 hover:scale-100"
          }`}
        >
          Activas
        </button>
        <button 
          onClick={() => setActiveTab("archivo")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
            activeTab === "archivo" 
              ? "bg-gray-900 text-white shadow-md scale-100" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 scale-95 hover:scale-100"
          }`}
        >
          Archivo
        </button>
      </div>

      {/* ── Dynamic Content ── */}
      <div className="pt-2">
        {activeTab === "activas" ? (
          /* Active State: The Demo Booking Card */
          <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-500">
            
            <div className="bg-white rounded-[1rem] border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                
                {/* Product/User Info Section */}
                <div className="flex gap-4">
                  <div className="mt-1 text-gray-500">
                    <User className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold text-gray-900 leading-none">Intermedio</h3>
                    <div className="inline-flex mt-1">
                      <span className="bg-[#FFF4E5] text-[#F5A623] text-[0.65rem] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Solicitada
                      </span>
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Proveedor: Santiago Rosales</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>111</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>Loja</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Date Section */}
                <div className="flex-1 md:border-l border-gray-100 md:pl-8 flex flex-col justify-center">
                  <span className="text-[0.7rem] font-extrabold text-[#875B9A] uppercase tracking-widest mb-2">
                    Fecha del Evento
                  </span>
                  <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>29 de Abril del 2026 - 30 de Abril del 2026</span>
                  </div>
                </div>

                {/* Pricing / Footer Section */}
                <div className="flex flex-col md:items-end justify-center md:border-l border-gray-100 md:pl-8 pt-4 md:pt-0 border-t md:border-t-0 mt-4 md:mt-0">
                  <span className="text-2xl font-black text-gray-900 tracking-tight">$300,00</span>
                  <span className="text-[0.75rem] text-gray-400 mt-1">Solicitado el: 03 de Abril del 2026</span>
                </div>

              </div>
            </div>

          </div>
        ) : (
          /* Archive Empty State */
          <div className="bg-[#F9FAFB] border border-gray-100 rounded-2xl py-24 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <p className="text-gray-500 font-medium">
              No hay reservas antiguas.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
