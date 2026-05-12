"use client";

import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">
        Ubicación del equipo
      </label>
      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 h-[44px] animate-pulse" />
      <div className="w-full rounded-xl border border-gray-200 bg-gray-50 animate-pulse" style={{ height: 280 }} />
    </div>
  ),
});

export default LocationPicker;
