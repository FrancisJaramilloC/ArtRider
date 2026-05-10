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
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-bold text-gray-900">Tu Bodega</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors rounded-full p-2 hover:bg-gray-50"
            >
              <Edit3 size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold text-xl shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
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
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSave}
                    disabled={submitting}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50"
                  >
                    <Check size={12} />
                    {submitting ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <X size={12} />
                    Cancelar
                  </button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 text-lg truncate">{brandName}</h3>
                <p className="text-sm text-gray-500">Sin calificaciones aún</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-gray-500 mb-0.5">Miembro desde</p>
            <p className="font-medium text-gray-900">{memberSince}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Equipos publicados</p>
            <p className="font-medium text-gray-900">
              {activeListingsCount} activos / {totalListingsCount} total
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Estado KYC</p>
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Pendiente de verificación
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
