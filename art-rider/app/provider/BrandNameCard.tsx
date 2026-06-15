"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Check, X } from "lucide-react";
import { updateProviderBrandName } from "@/services/providerService";

interface Props {
  brandName: string;
  initials: string;
  memberSince: string;
  activeListingsCount: number;
  totalListingsCount: number;
}

export default function BrandNameCard({
  brandName,
  initials,
  memberSince,
  activeListingsCount,
  totalListingsCount,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(brandName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (inputValue.trim() === brandName) { setEditing(false); return; }
    setSubmitting(true);
    setError(null);
    const result = await updateProviderBrandName(inputValue);
    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setInputValue(brandName);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="xl:col-span-1">
      <div className="bg-white border border-slate-100 rounded-xl px-4 py-4">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tu Bodega</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-slate-400 hover:text-slate-700 transition-colors rounded-lg p-1.5 hover:bg-slate-50"
            >
              <Edit3 size={13} />
            </button>
          )}
        </div>

        {/* Avatar + nombre */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  maxLength={80}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleSave}
                    disabled={submitting}
                    className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-semibold hover:bg-black transition-colors disabled:opacity-50"
                  >
                    <Check size={10} />
                    {submitting ? "..." : "Guardar"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex items-center gap-1 px-2 py-0.5 border border-slate-200 text-slate-600 rounded-md text-[10px] font-semibold hover:bg-slate-50 transition-colors"
                  >
                    <X size={10} />
                    Cancelar
                  </button>
                </div>
                {error && <p className="text-[10px] text-red-600">{error}</p>}
              </div>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 text-[13px] truncate">{brandName}</h3>
                <p className="text-[11px] text-slate-400">Sin calificaciones aún</p>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 text-[11px]">
          <div>
            <p className="text-slate-400 mb-0.5">Miembro desde</p>
            <p className="font-medium text-slate-900">{memberSince}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Equipos publicados</p>
            <p className="font-medium text-slate-900">
              {activeListingsCount} activos / {totalListingsCount} total
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Estado KYC</p>
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium text-[10px]">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Pendiente de verificación
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
