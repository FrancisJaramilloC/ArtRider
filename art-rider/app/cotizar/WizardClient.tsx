"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitAdvisoryRequest } from "@/services/advisoryService";
import type { EventType, VenueType, ActivityType, WizardInput } from "@/services/advisoryService";
import { 
  CheckCircle2, Loader2, ArrowRight, ArrowLeft,
  Cake, Heart, Mic2, Tent, Music,
  Home, Building2, Building, TreePine, Map, MapPin, Pencil,
  Mic, Tv, Headphones, Sparkles, Guitar
} from "lucide-react";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  cumpleanos: <Cake className="w-8 h-8" />, 
  boda: <Heart className="w-8 h-8" />, 
  conferencia: <Mic2 className="w-8 h-8" />, 
  festival: <Tent className="w-8 h-8" />, 
  concierto: <Music className="w-8 h-8" />,
};
const VENUE_ICONS: Record<string, React.ReactNode> = {
  sala_pequena: <Home className="w-8 h-8" />, 
  casa: <Building className="w-8 h-8" />, 
  salon_de_eventos: <Building2 className="w-8 h-8" />, 
  quinta: <TreePine className="w-8 h-8" />, 
  parque: <Map className="w-8 h-8" />, 
  estadio: <MapPin className="w-8 h-8" />, 
  personalizado: <Pencil className="w-8 h-8" />
};
const VENUE_SUBTEXT: Record<string, string> = {
  sala_pequena: "Hasta 50m²", casa: "Hasta 150m²", salon_de_eventos: "Hasta 300m²", quinta: "500m²+ (Exteriores)", parque: "Espacio abierto", estadio: "Masivo", personalizado: "Define tú mismo"
};
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  discursos: <Mic className="w-6 h-6" />, 
  pantalla_led: <Tv className="w-6 h-6" />, 
  dj: <Headphones className="w-6 h-6" />, 
  show: <Sparkles className="w-6 h-6" />, 
  banda: <Guitar className="w-6 h-6" />,
};

export default function WizardClient({
  eventTypes,
  venueTypes,
  activityTypes,
}: {
  eventTypes: EventType[];
  venueTypes: VenueType[];
  activityTypes: ActivityType[];
}) {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState<WizardInput>({
    event_type_slug: "",
    guest_count: 50,
    venue_type_slug: "",
    activities: [],
    budget_min: 50,
    budget_max: 500,
    event_date: "",
    event_city: "",
  });

  const canGoNext = () => {
    switch (step) {
      case 1: return form.event_type_slug !== "";
      case 2: return form.guest_count > 0;
      case 3: return form.venue_type_slug !== "";
      case 4: return form.activities.length > 0;
      case 5: return form.event_date !== "" && form.event_city !== "";
      case 6: return true; // Presupuesto tiene defaults
      default: return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && step < 6) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    
    try {
      const res = await submitAdvisoryRequest(form);
      if (res.success) {
        // Redirigimos a la vista de "estamos buscando" o si es Fase 0 a "resultado" directo
        router.push(`/cotizar/resultado?requestId=${res.requestId}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error");
      }
    } catch (e: any) {
      setErrorMsg("Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActivity = (slug: string) => {
    setForm(prev => ({
      ...prev,
      activities: prev.activities.includes(slug) 
        ? prev.activities.filter(a => a !== slug)
        : [...prev.activities, slug]
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-gray-100 h-2 w-full">
        <div 
          className="bg-black h-2 transition-all duration-300" 
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      <div className="p-8 sm:p-12 min-h-[400px] flex flex-col">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        {/* Step 1: Tipo de Evento */}
        {step === 1 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Qué tipo de evento tienes en mente?</h2>
            <p className="text-gray-500 mb-8">Elige la opción que mejor describa tu celebración.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {eventTypes.map(et => (
                <button
                  key={et.slug}
                  onClick={() => setForm({ ...form, event_type_slug: et.slug })}
                  className={`p-6 rounded-xl border-2 text-left transition-all group ${
                    form.event_type_slug === et.slug 
                      ? "border-[#875B9A] bg-purple-50 ring-2 ring-[#875B9A] ring-opacity-20" 
                      : "border-gray-200 hover:border-[#875B9A]/40 hover:bg-gray-50"
                  }`}
                >
                  <div className={`mb-3 transition-colors ${form.event_type_slug === et.slug ? "text-[#875B9A]" : "text-gray-400 group-hover:text-[#875B9A]/70"}`}>
                    {EVENT_ICONS[et.slug] || <Sparkles className="w-8 h-8" />}
                  </div>
                  <h3 className={`font-semibold text-lg ${form.event_type_slug === et.slug ? "text-gray-900" : "text-gray-700"}`}>{et.label}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Invitados */}
        {step === 2 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Cuántas personas asistirán?</h2>
            <p className="text-gray-500 mb-8">Un aproximado nos ayuda a calcular el tamaño del equipo de sonido.</p>
            
            <div className="max-w-md mx-auto mt-12">
              <div className="text-center mb-6">
                <span className="text-6xl font-bold">{form.guest_count}</span>
                <span className="text-gray-500 text-xl ml-2">personas</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Intimo (10)</span>
                <span>Masivo (1000+)</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Venue */}
        {step === 3 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Dónde será tu evento?</h2>
            <p className="text-gray-500 mb-8">Esto influye si necesitamos equipos para exteriores o acústica especial.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...venueTypes, { slug: "personalizado", label: "Personalizado" }].map(vt => (
                <button
                  key={vt.slug}
                  onClick={() => setForm({ ...form, venue_type_slug: vt.slug })}
                  className={`p-4 rounded-xl border-2 text-center transition-all group ${
                    form.venue_type_slug === vt.slug 
                      ? "border-[#875B9A] bg-purple-50 ring-2 ring-[#875B9A] ring-opacity-20" 
                      : "border-gray-200 hover:border-[#875B9A]/40 hover:bg-gray-50"
                  }`}
                >
                  <div className={`mx-auto w-fit mb-2 transition-colors ${form.venue_type_slug === vt.slug ? "text-[#875B9A]" : "text-gray-400 group-hover:text-[#875B9A]/70"}`}>
                    {VENUE_ICONS[vt.slug] || <Map className="w-8 h-8" />}
                  </div>
                  <h3 className={`font-medium ${form.venue_type_slug === vt.slug ? "text-gray-900" : "text-gray-700"}`}>{vt.label}</h3>
                  <p className="text-xs text-gray-400 mt-1">{VENUE_SUBTEXT[vt.slug]}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Actividades */}
        {step === 4 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Qué habrá en tu evento?</h2>
            <p className="text-gray-500 mb-8">Selecciona todas las que apliquen.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activityTypes.map(at => {
                const isSelected = form.activities.includes(at.slug);
                return (
                  <button
                    key={at.slug}
                    onClick={() => toggleActivity(at.slug)}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all group ${
                      isSelected 
                        ? "border-[#875B9A] bg-purple-50" 
                        : "border-gray-200 hover:border-[#875B9A]/40 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transition-colors ${isSelected ? "text-[#875B9A]" : "text-gray-400 group-hover:text-[#875B9A]/70"}`}>
                        {ACTIVITY_ICONS[at.slug] || <Sparkles className="w-6 h-6" />}
                      </span>
                      <span className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}>{at.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-[#875B9A]" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 5: Fecha y Ciudad */}
        {step === 5 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Cuándo y dónde será tu evento?</h2>
            <p className="text-gray-500 mb-8">Buscaremos proveedores locales con disponibilidad para estas fechas.</p>
            
            <div className="max-w-md mx-auto mt-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del evento</label>
                <input 
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={form.event_date || ""}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-medium focus:border-black focus:ring-0 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad (Ej: Loja, Quito)</label>
                <input 
                  type="text"
                  placeholder="Ciudad del evento"
                  value={form.event_city || ""}
                  onChange={(e) => setForm({ ...form, event_city: e.target.value })}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-xl font-medium focus:border-black focus:ring-0 outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Presupuesto */}
        {step === 6 && (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold mb-2">¿Cuál es tu presupuesto aproximado?</h2>
            <p className="text-gray-500 mb-8">No te preocupes, buscaremos la mejor opción que se ajuste.</p>
            
            <div className="max-w-md mx-auto mt-12">
              <div className="text-center mb-6">
                <span className="text-4xl font-bold">${form.budget_max}</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="5000" 
                step="50"
                value={form.budget_max}
                onChange={(e) => setForm({ ...form, budget_max: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>$50</span>
                <span>$5000+</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 pt-6 border-t flex items-center justify-between">
          {step > 1 ? (
            <button 
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 text-gray-600 hover:text-black font-medium transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          ) : <div></div>}

          {step < 6 ? (
            <button 
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Buscando opciones...</>
              ) : (
                "Buscar Proveedores"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
