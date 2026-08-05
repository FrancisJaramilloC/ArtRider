"use client";

import { useState } from "react";
import { CalendarDays, Users, MapPin, Music, DollarSign, Activity, Zap, Lightbulb, Volume2, ChevronDown, ChevronUp } from "lucide-react";

type AdvisoryRequest = {
  id: string;
  created_at: string;
  event_type_slug: string;
  guest_count: number;
  venue_type_slug: string;
  activities: string[];
  budget_min: number | null;
  budget_max: number | null;
  event_date: string | null;
  event_notes: string | null;
  ecs_score: number;
  ecs_level: string;
  audio_requirement: string;
  lighting_requirement: string;
  stage_requirement: string;
  power_backup: boolean;
  generated_ptr: Record<string, unknown> | null;
  status: string;
  advisory_proposals: any[];
};

const LEVEL_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  VERY_HIGH: "bg-red-100 text-red-700",
  NONE: "bg-gray-100 text-gray-500",
  SMALL: "bg-blue-100 text-blue-700",
  LARGE: "bg-purple-100 text-purple-700",
};

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[level] || "bg-gray-100 text-gray-600"}`}>
      {level}
    </span>
  );
}

function EcsBar({ score, level }: { score: number; level: string }) {
  const maxScore = 200;
  const pct = Math.min(100, (score / maxScore) * 100);
  const barColor = level === "LOW" ? "bg-green-400" : level === "MEDIUM" ? "bg-yellow-400" : level === "HIGH" ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-10 text-right">{score}</span>
      <LevelBadge level={level} />
    </div>
  );
}

export default function SolicitudesClient({ requests }: { requests: AdvisoryRequest[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  if (requests.length === 0) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-400">Sin solicitudes aún</h2>
        <p className="text-gray-400 mt-2">Cuando un cliente use el wizard de cotización, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes del Motor</h1>
        <p className="text-gray-500 mt-1">{requests.length} solicitudes totales. Haz clic para ver las métricas del algoritmo.</p>
      </div>

      <div className="space-y-3">
        {requests.map((req) => {
          const isExpanded = expandedId === req.id;
          const proposal = req.advisory_proposals?.[0];
          const city = req.event_notes?.match(/Ciudad: (.+)/)?.[1]?.trim() || "—";

          return (
            <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Row Summary */}
              <button
                onClick={() => toggle(req.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm capitalize">{req.event_type_slug?.replace(/_/g, " ")}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> {req.guest_count} pax</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {city}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(req.created_at).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <LevelBadge level={req.ecs_level} />
                    {proposal ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Con propuesta</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sin propuesta</span>
                    )}
                  </div>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input del Cliente */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Lo que pidió el cliente</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><Music className="w-3.5 h-3.5" /> Tipo de Evento</span>
                          <span className="font-medium capitalize">{req.event_type_slug?.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Invitados</span>
                          <span className="font-medium">{req.guest_count} personas</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Lugar</span>
                          <span className="font-medium capitalize">{req.venue_type_slug?.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Ciudad</span>
                          <span className="font-medium">{city}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Presupuesto</span>
                          <span className="font-medium">${req.budget_min || 0} - ${req.budget_max || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Fecha</span>
                          <span className="font-medium">{req.event_date ? new Date(req.event_date).toLocaleDateString("es-EC") : "No especificada"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Actividades</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {req.activities?.map((a) => (
                              <span key={a} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">{a}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Métricas del Motor */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Cálculos del Motor</h3>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">ECS (Event Complexity Score)</p>
                        <EcsBar score={req.ecs_score} level={req.ecs_level} />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Audio Requerido</span>
                          <LevelBadge level={req.audio_requirement} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> Iluminación Requerida</span>
                          <LevelBadge level={req.lighting_requirement} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-1.5"><Activity className="w-4 h-4" /> Escenario Requerido</span>
                          <LevelBadge level={req.stage_requirement} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-1.5"><Zap className="w-4 h-4" /> Respaldo Eléctrico</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${req.power_backup ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                            {req.power_backup ? "SÍ" : "NO"}
                          </span>
                        </div>
                      </div>

                      {/* Propuesta Generada */}
                      {proposal && (
                        <div className="mt-5 p-4 bg-white rounded-xl border border-gray-200">
                          <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Propuesta Generada</h4>
                          <div className="space-y-2">
                            {proposal.items?.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-gray-700">{item.quantity}x {item.title}</span>
                                <span className="font-medium">${((item.unit_price * item.quantity) / 100).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
                              <span>Total</span>
                              <span>${(proposal.total / 100).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Estado: <span className="capitalize font-medium">{proposal.status}</span></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
