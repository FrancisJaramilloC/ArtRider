"use client";

import { useState, Fragment } from "react";
import { Package, X, Search, CheckCircle2, AlertTriangle, Save, Loader2, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { updateListingSpecs, type AdminListing } from "@/services/adminService";

export default function EquiposClient({ initialListings }: { initialListings: AdminListing[] }) {
  const [listings, setListings] = useState(initialListings);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminListing | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [specsForm, setSpecsForm] = useState<Record<string, any>>({});

  const filtered = listings.filter(l => 
    l.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.provider?.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditor = (listing: AdminListing) => {
    setEditing(listing);
    setSpecsForm(listing.specs || {});
  };

  const closeEditor = () => {
    setEditing(null);
    setSpecsForm({});
  };

  const handleSpecChange = (key: string, value: any) => {
    setSpecsForm(prev => ({ ...prev, [key]: value }));
  };

  const saveSpecs = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await updateListingSpecs(editing.id, specsForm);
      if (res.success) {
        setListings(prev => prev.map(l => l.id === editing.id ? { ...l, specs: specsForm } : l));
        closeEditor();
      } else {
        alert("Error al guardar: " + res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex gap-6 relative h-[calc(100vh-8rem)]">
      {/* Lista de Equipos */}
      <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${editing ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Equipos & Metadata</h1>
            <p className="text-sm text-gray-500">Asigna especificaciones técnicas a los equipos.</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar equipo o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 text-gray-500 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-5 py-3 font-medium">Equipo</th>
                <th className="px-5 py-3 font-medium">Proveedor / Ciudad</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium">Estado Metadata</th>
                <th className="px-5 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(listing => {
                const hasSpecs = listing.specs && Object.keys(listing.specs).length > 0;
                const isExpanded = expandedRow === listing.id;

                return (
                  <Fragment key={listing.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {listing.cover_image_url ? (
                            <img src={listing.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 max-w-[200px] truncate">{listing.title}</p>
                            <p className="text-xs text-gray-500">
                              {listing.brand || "Sin marca"} {listing.model ? `• ${listing.model}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">{listing.provider?.brand_name || "Desconocido"}</p>
                        <p className="text-xs text-gray-500">{listing.address?.city || "Sin ciudad"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs capitalize font-medium">
                          {listing.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {hasSpecs ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : listing.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => openEditor(listing)}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Editar Specs
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="p-0 border-b border-gray-100">
                          <div className="bg-gray-50/50 p-5 pl-16 text-sm flex gap-12 whitespace-normal border-y border-gray-100 shadow-inner">
                            <div className="flex-1 max-w-md">
                              <h4 className="font-bold text-gray-700 mb-1">Descripción</h4>
                              <p className="text-gray-600 whitespace-pre-wrap">{listing.description || "No hay descripción disponible para este equipo."}</p>
                            </div>
                            <div className="flex-1 max-w-xs space-y-3">
                              <div>
                                <h4 className="font-bold text-gray-700 mb-1">Precio por Día</h4>
                                <p className="text-gray-600 text-lg">${(listing.daily_price / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-700 mb-1">Estado</h4>
                                <p className="text-gray-600">
                                  {listing.is_published ? (
                                    <span className="text-green-600 font-medium">Público (Activo)</span>
                                  ) : (
                                    <span className="text-gray-500 font-medium">Oculto (Borrador)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Lateral */}
      {editing && (
        <div className="w-full lg:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-900">Editar Metadata</h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{editing.title}</p>
            </div>
            <button onClick={closeEditor} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-5">
            {/* Campos Dinámicos según categoría */}
            {(editing.category === "audio" || editing.category === "sonido") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Potencia (Watts RMS)</label>
                  <input type="number" value={specsForm.potencia_watts_rms || ""} onChange={e => handleSpecChange("potencia_watts_rms", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm" placeholder="Ej: 2000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Sistema</label>
                  <select value={specsForm.tipo_sistema || ""} onChange={e => handleSpecChange("tipo_sistema", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="PA Basico">PA Básico (Voces/Música ambiente)</option>
                    <option value="Refuerzo Sonoro">Refuerzo Sonoro (Banda/DJ)</option>
                    <option value="Line Array">Line Array (Conciertos)</option>
                    <option value="Monitoreo">Monitoreo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cobertura Óptima (Personas)</label>
                  <input type="number" value={specsForm.cobertura_personas || ""} onChange={e => handleSpecChange("cobertura_personas", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm" placeholder="Ej: 150" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!specsForm.incluye_subwoofer} onChange={e => handleSpecChange("incluye_subwoofer", e.target.checked)} className="rounded border-gray-300 text-black focus:ring-black" />
                  Incluye Subwoofer
                </label>
              </>
            )}

            {(editing.category === "lighting" || editing.category === "iluminacion") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Iluminación</label>
                  <select value={specsForm.tipo_iluminacion || ""} onChange={e => handleSpecChange("tipo_iluminacion", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="Ambiental">Ambiental / Perimetral</option>
                    <option value="Escenografica">Escenográfica / Frontal</option>
                    <option value="Efectos">Efectos / Fiesta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Luminarias</label>
                  <input type="number" value={specsForm.cantidad_luminarias || ""} onChange={e => handleSpecChange("cantidad_luminarias", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm" placeholder="Ej: 4" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!specsForm.incluye_dmx} onChange={e => handleSpecChange("incluye_dmx", e.target.checked)} className="rounded border-gray-300 text-black focus:ring-black" />
                  Controlable vía DMX
                </label>
              </>
            )}

            {editing.category === "video" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Video</label>
                  <select value={specsForm.tipo_video || ""} onChange={e => handleSpecChange("tipo_video", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="Pantalla LED">Pantalla LED Modular</option>
                    <option value="Proyector">Proyector + Telón</option>
                    <option value="TV">Monitor / TV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño (Pulgadas o Metros cuadrados)</label>
                  <input type="number" value={specsForm.tamano || ""} onChange={e => handleSpecChange("tamano", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black sm:text-sm" placeholder="Ej: 120" />
                </div>
              </>
            )}
            
            {/* Campos Genéricos si no cae en las de arriba o si faltan specs (Fallback) */}
            {(!["audio", "sonido", "lighting", "iluminacion", "video"].includes(editing.category || "")) && (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm">
                No hay campos estructurados específicos definidos para la categoría <strong>{editing.category}</strong>. Puedes agregar metadata JSON en bruto en futuras versiones.
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50/50">
            <button 
              onClick={saveSpecs}
              disabled={saving}
              className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Guardando..." : "Guardar Metadata"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
