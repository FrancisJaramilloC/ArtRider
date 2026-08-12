"use client";

import { useState, Fragment } from "react";
import { Package, X, Search, CheckCircle2, AlertTriangle, Save, Loader2, Image as ImageIcon, ChevronDown, ChevronUp, Trash2, Wand2 } from "lucide-react";
import { updatePackageSpecs, adminDeletePackage, type AdminPackage } from "@/services/adminService";

export default function PaquetesClient({ initialPackages }: { initialPackages: AdminPackage[] }) {
  const [packages, setPackages] = useState(initialPackages);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPackage | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [specsForm, setSpecsForm] = useState<Record<string, any>>({});

  const handleDeletePackage = async (pkg: AdminPackage) => {
    if (!confirm(`¿Eliminar paquete "${pkg.title}"? Esta acción lo ocultará de toda la plataforma.`)) return;
    setDeleting(pkg.id);
    try {
      const res = await adminDeletePackage(pkg.id);
      if (res.success) {
        setPackages(prev => prev.filter(p => p.id !== pkg.id));
        if (editing?.id === pkg.id) closeEditor();
        if (expandedRow === pkg.id) setExpandedRow(null);
      } else {
        alert("Error al eliminar: " + res.error);
      }
    } finally {
      setDeleting(null);
    }
  };

  const filtered = packages.filter(p => 
    p.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditor = (pkg: AdminPackage) => {
    setEditing(pkg);
    setSpecsForm(pkg.specs || {});
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
      const res = await updatePackageSpecs(editing.id, specsForm);
      if (res.success) {
        setPackages(prev => prev.map(p => p.id === editing.id ? { ...p, specs: specsForm } : p));
        closeEditor();
      } else {
        alert("Error al guardar: " + res.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const autoCalculateSpecs = () => {
    if (!editing || !editing.package_items) return;
    
    let totalPotencia = 0;
    let totalCobertura = 0;
    let maxSpl = 0;
    let totalLuces = 0;
    let tieneSubwoofer = false;
    let tieneDmx = false;
    let environment = "Interiores"; // Default
    let tiposSistema = new Set<string>();
    
    editing.package_items.forEach(item => {
      const q = item.quantity || 1;
      const s = item.listings?.specs || {};
      
      // Audio
      if (s.potencia_watts_rms) totalPotencia += Number(s.potencia_watts_rms) * q;
      if (s.cobertura_personas) totalCobertura += Number(s.cobertura_personas) * q;
      if (s.max_spl && Number(s.max_spl) > maxSpl) maxSpl = Number(s.max_spl);
      if (s.incluye_subwoofer) tieneSubwoofer = true;
      if (s.tipo_sistema) {
        if (Array.isArray(s.tipo_sistema)) {
          s.tipo_sistema.forEach((t: string) => tiposSistema.add(t));
        } else {
          tiposSistema.add(s.tipo_sistema as string);
        }
      }
      
      // Luces
      if (item.listings?.category === 'lighting' || item.listings?.category === 'iluminacion') {
        totalLuces += q;
      }
      if (s.incluye_dmx) tieneDmx = true;
    });

    setSpecsForm(prev => ({
      ...prev,
      environment: prev.environment || environment,
      potencia_watts_rms: totalPotencia || prev.potencia_watts_rms,
      cobertura_personas: totalCobertura || prev.cobertura_personas,
      max_spl: maxSpl || prev.max_spl,
      incluye_subwoofer: tieneSubwoofer || prev.incluye_subwoofer,
      tipo_sistema: tiposSistema.size > 0 ? Array.from(tiposSistema) : prev.tipo_sistema,
      cantidad_luminarias: totalLuces || prev.cantidad_luminarias,
      incluye_dmx: tieneDmx || prev.incluye_dmx,
    }));
  };

  return (
    <div className="max-w-6xl mx-auto flex gap-6 relative h-[calc(100vh-8rem)]">
      {/* Lista de Paquetes */}
      <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${editing ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Paquetes & Metadata</h1>
            <p className="text-sm text-gray-500">Configura la metadata técnica de los combos.</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar paquete..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:bg-white w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 text-gray-500 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-5 py-3 font-medium">Paquete</th>
                <th className="px-5 py-3 font-medium">Equipos Incluidos</th>
                <th className="px-5 py-3 font-medium">Estado Metadata</th>
                <th className="px-5 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(pkg => {
                const hasSpecs = pkg.specs && Object.keys(pkg.specs).length > 0;
                const isExpanded = expandedRow === pkg.id;
                const itemsCount = pkg.package_items?.length || 0;

                return (
                  <Fragment key={pkg.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {pkg.cover_image_url ? (
                            <img src={pkg.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 max-w-[200px] truncate">{pkg.title}</p>
                            <p className="text-xs text-gray-500 font-medium">
                              ${(pkg.daily_price / 100).toFixed(2)} / día
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-gray-600">{itemsCount} equipos</span>
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
                            onClick={() => handleDeletePackage(pkg)}
                            disabled={deleting === pkg.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar paquete"
                          >
                            {deleting === pkg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : pkg.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => openEditor(pkg)}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Editar Specs
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} className="p-0 border-b border-gray-100">
                          <div className="bg-gray-50/50 p-5 pl-16 text-sm whitespace-normal border-y border-gray-100 shadow-inner">
                            <h4 className="font-bold text-gray-700 mb-2">Equipos en este paquete:</h4>
                            <ul className="space-y-1.5 max-w-lg mb-4">
                              {pkg.package_items?.map((item, i) => (
                                <li key={i} className="flex gap-2 text-gray-600">
                                  <span className="font-medium text-gray-900">{item.quantity}x</span>
                                  {item.listings?.title} 
                                  <span className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 rounded">{item.listings?.category}</span>
                                </li>
                              ))}
                            </ul>
                            
                            <h4 className="font-bold text-gray-700 mb-1">Descripción</h4>
                            <p className="text-gray-600 whitespace-pre-wrap max-w-2xl">{pkg.description || "Sin descripción."}</p>
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
          <div className="p-5 border-b border-gray-100 flex flex-col gap-3 bg-gray-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Specs del Paquete</h3>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{editing.title}</p>
              </div>
              <button onClick={closeEditor} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 -mr-2">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={autoCalculateSpecs}
              className="flex items-center justify-center gap-2 w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-colors border border-purple-200 shadow-sm"
              title="Calcula sumando los equipos que componen este paquete"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Auto-calcular desde equipos
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-6">
            
            {/* --- SECCIÓN GENERAL --- */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Datos Generales</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Uso Recomendado</label>
                  <select value={specsForm.environment || ""} onChange={e => handleSpecChange("environment", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="Interiores">Interiores</option>
                    <option value="Exteriores">Exteriores</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Consumo (Watts)</label>
                  <input type="number" value={specsForm.consumo_watts || ""} onChange={e => handleSpecChange("consumo_watts", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-black focus:border-black text-sm" placeholder="Ej: 1500" />
                </div>
              </div>
            </div>

            {/* --- SECCIÓN AUDIO --- */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Audio Combinado</h4>
              <div className="space-y-3 bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Potencia Total (RMS)</label>
                    <input type="number" value={specsForm.potencia_watts_rms || ""} onChange={e => handleSpecChange("potencia_watts_rms", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm" placeholder="Ej: 2000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Max SPL (dB)</label>
                    <input type="number" value={specsForm.max_spl || ""} onChange={e => handleSpecChange("max_spl", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm" placeholder="Ej: 132" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Tipos de Sistema Predominantes</label>
                  <div className="space-y-2">
                    {[
                      { id: "PA Basico", label: "PA Básico (Voces/Música ambiente)" },
                      { id: "Refuerzo Sonoro", label: "Refuerzo Sonoro (Banda/DJ)" },
                      { id: "Line Array", label: "Line Array (Conciertos)" },
                      { id: "Monitoreo", label: "Monitoreo" }
                    ].map(type => {
                      const currentTypes = Array.isArray(specsForm.tipo_sistema) ? specsForm.tipo_sistema : (specsForm.tipo_sistema ? [specsForm.tipo_sistema] : []);
                      const isChecked = currentTypes.includes(type.id);
                      return (
                        <label key={type.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={(e) => {
                              let newTypes = [...currentTypes];
                              if (e.target.checked) newTypes.push(type.id);
                              else newTypes = newTypes.filter(t => t !== type.id);
                              handleSpecChange("tipo_sistema", newTypes);
                            }}
                            className="rounded border-gray-300 text-black focus:ring-black"
                          />
                          {type.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cobertura Óptima (Personas)</label>
                  <input type="number" value={specsForm.cobertura_personas || ""} onChange={e => handleSpecChange("cobertura_personas", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm" placeholder="Ej: 150" />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                  <input type="checkbox" checked={!!specsForm.incluye_subwoofer} onChange={e => handleSpecChange("incluye_subwoofer", e.target.checked)} className="rounded border-gray-300 text-black focus:ring-black" />
                  Incluye Subwoofer
                </label>
              </div>
            </div>

            {/* --- SECCIÓN ILUMINACIÓN --- */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Iluminación Combinada</h4>
              <div className="space-y-3 bg-amber-50/50 border border-amber-100 p-3 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Iluminación Predominante</label>
                  <select value={specsForm.tipo_iluminacion || ""} onChange={e => handleSpecChange("tipo_iluminacion", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="Ambiental">Ambiental / Perimetral</option>
                    <option value="Escenografica">Escenográfica / Frontal</option>
                    <option value="Efectos">Efectos / Fiesta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad Total de Luminarias</label>
                  <input type="number" value={specsForm.cantidad_luminarias || ""} onChange={e => handleSpecChange("cantidad_luminarias", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm" placeholder="Ej: 4" />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                  <input type="checkbox" checked={!!specsForm.incluye_dmx} onChange={e => handleSpecChange("incluye_dmx", e.target.checked)} className="rounded border-gray-300 text-black focus:ring-black" />
                  Controlable vía DMX
                </label>
              </div>
            </div>

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
