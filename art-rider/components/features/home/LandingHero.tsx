"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ShieldCheck, Headphones, BadgeCheck, ChevronRight } from "lucide-react";
import type { CityInfo, EventTypeId } from "@/lib/eventCategoryMap";
import { EVENT_TYPES } from "@/lib/eventCategoryMap";
import SearchDiscoveryPanel from "./SearchDiscoveryPanel";

interface LandingHeroProps {
  cities: CityInfo[];
}

export default function LandingHero({ cities }: LandingHeroProps) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<EventTypeId | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityInfo | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [panelStep, setPanelStep] = useState<"event" | "date" | "location" | null>(null);

  const eventLabel = selectedEvent
    ? EVENT_TYPES.find((e) => e.id === selectedEvent)?.label ?? null
    : null;

  const handleSelectEvent = useCallback((id: EventTypeId) => {
    setSelectedEvent(id);
    // Advance to date tab after 300ms
    setTimeout(() => setPanelStep("date"), 300);
  }, []);

  const handleSelectDates = useCallback((start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      setTimeout(() => setPanelStep("location"), 300);
    }
  }, []);

  const handleSelectCity = useCallback(
    (city: CityInfo) => {
      setSelectedCity(city);
      // If event is already selected, auto-search
      const params = new URLSearchParams();
      if (selectedEvent) params.set("eventType", selectedEvent);
      params.set("city", city.city);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      setPanelStep(null);
      router.push(`/explore?${params.toString()}`);
    },
    [selectedEvent, startDate, endDate, router],
  );

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedEvent) params.set("eventType", selectedEvent);
    if (selectedCity) params.set("city", selectedCity.city);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    setPanelStep(null);
    router.push(`/explore?${params.toString()}`);
  };

  const handleClose = useCallback(() => setPanelStep(null), []);

  const trust = [
    { Icon: BadgeCheck,  label: "Proveedores verificados" },
    { Icon: ShieldCheck, label: "Pago protegido SafeRider" },
    { Icon: Headphones,  label: "Soporte 24/7" },
  ];



  return (
    <section className="max-w-[760px] mx-auto px-6 pt-[54px] pb-[30px] text-center">
      <h1
        className="text-[46px] font-extrabold tracking-[-0.03em] leading-[1.08] text-gray-900"
        style={{ textWrap: "balance" } as React.CSSProperties}
      >
        Encuentra el equipo perfecto para{" "}
        <span className="bg-gradient-to-r from-[#875B9A] to-[#6a437a] bg-clip-text text-transparent">
          tu evento
        </span>
      </h1>

      <p
        className="text-[16px] text-gray-400 font-medium mt-4 max-w-[560px] mx-auto leading-[1.55]"
        style={{ textWrap: "pretty" } as React.CSSProperties}
      >
        Audio, iluminación, video y efectos profesionales. Renta directo de
        productores locales verificados en todo el Ecuador.
      </p>

      {/* Search bar */}
      <div className="relative mt-7 max-w-[800px] mx-auto lg:ml-[8%] lg:mr-auto">
        <div
          className={`flex items-center h-[66px] rounded-full transition-all duration-200 border ${
            panelStep
              ? "bg-white border-transparent shadow-[0_16px_40px_-12px_rgba(135,91,154,.2),0_0_0_2px_rgba(135,91,154,.15)]"
              : "bg-white border-gray-200 shadow-[0_12px_34px_-10px_rgba(22,19,28,.22),0_2px_6px_rgba(22,19,28,.06)]"
          }`}
        >
          {/* Segment 1: Event type */}
          <button
            type="button"
            onClick={() => setPanelStep((s) => (s === "event" ? null : "event"))}
            className={`flex flex-col justify-center flex-1 min-w-0 h-full pl-[32px] pr-4 rounded-full transition-all text-left ${
              panelStep === "event"
                ? "bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] z-10"
                : panelStep
                  ? "hover:bg-gray-100"
                  : "hover:bg-gray-50"
            }`}
          >
            {eventLabel ? (
              <>
                <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Evento</p>
                <p className="text-[13.5px] font-semibold text-gray-500 truncate leading-tight mt-1">{eventLabel}</p>
              </>
            ) : (
              <>
                <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Evento</p>
                <p className="text-[13.5px] font-medium text-gray-500 truncate mt-1">
                  ¿Qué estás organizando?
                </p>
              </>
            )}
          </button>

          {/* Divider */}
          <div className={`w-px h-[32px] bg-gray-300 shrink-0 transition-opacity ${panelStep === "event" || panelStep === "date" ? "opacity-0" : "opacity-100"}`} />

          {/* Segment 2: Dates */}
          <button
            type="button"
            onClick={() => setPanelStep((s) => (s === "date" ? null : "date"))}
            className={`flex flex-col justify-center flex-1 min-w-0 h-full px-[24px] rounded-full transition-all text-left ${
              panelStep === "date"
                ? "bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] z-10"
                : panelStep
                  ? "hover:bg-gray-100"
                  : "hover:bg-gray-50"
            }`}
          >
            {(startDate || endDate) ? (
              <>
                <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Fechas</p>
                <p className="text-[13.5px] font-semibold text-gray-500 truncate leading-tight mt-1">
                  {startDate ? new Date(startDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : "?"} 
                  {" - "} 
                  {endDate ? new Date(endDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : "?"}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Fechas</p>
                <p className="text-[13.5px] font-medium text-gray-500 truncate mt-1">
                  ¿Cuándo?
                </p>
              </>
            )}
          </button>

          {/* Divider */}
          <div className={`w-px h-[32px] bg-gray-300 shrink-0 transition-opacity ${panelStep === "date" || panelStep === "location" ? "opacity-0" : "opacity-100"}`} />

          {/* Segment 3: Location */}
          <div
            className={`flex items-center flex-1 min-w-0 h-full rounded-full transition-all ${
              panelStep === "location"
                ? "bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)] z-10"
                : panelStep
                  ? "hover:bg-gray-100"
                  : "hover:bg-gray-50"
            }`}
          >
            <button
              type="button"
              onClick={() => setPanelStep((s) => (s === "location" ? null : "location"))}
              className="flex-1 h-full pl-[24px] pr-2 text-left rounded-full flex flex-col justify-center min-w-0"
            >
              {selectedCity ? (
                <>
                  <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Ubicación</p>
                  <p className="text-[13.5px] font-semibold text-gray-500 truncate leading-tight mt-1">
                    {selectedCity.city}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11.5px] font-extrabold text-gray-800 tracking-wide leading-none">Dónde</p>
                  <p className="text-[13.5px] font-medium text-gray-500 whitespace-nowrap mt-1">
                    Tu ciudad
                  </p>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="shrink-0 w-[48px] h-[48px] mr-[9px] bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white rounded-full shadow-[0_8px_20px_-8px_rgba(135,91,154,.6)] hover:brightness-105 active:scale-[.97] transition-all flex items-center justify-center"
            >
              <Search size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Discovery panel */}
        {panelStep && (
          <SearchDiscoveryPanel
            cities={cities}
            activeTab={panelStep}
            selectedEvent={selectedEvent}
            onSelectEvent={handleSelectEvent}
            onSelectCity={handleSelectCity}
            startDate={startDate}
            endDate={endDate}
            onSelectDates={handleSelectDates}
            onClose={handleClose}
          />
        )}
      </div>

      {/* Trust badges */}
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-6">
        {trust.map(({ Icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-600"
          >
            <Icon size={15} className="text-[#875B9A]" />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
