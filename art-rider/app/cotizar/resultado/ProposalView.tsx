"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck, HelpCircle, Star, Zap, Crown, Volume2, Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptProposal } from "@/services/advisoryService";
import { useCart } from "@/contexts/CartContext";

type ProposalItem = {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  note?: string;
  metrics?: string[];
};

type AdvisoryRequestView = {
  guest_count: number;
  event_date: string | null;
};

type AdvisoryProposalView = {
  id: string;
  tier: "economico" | "recomendado" | "premium";
  items: ProposalItem[];
  subtotal: number;
  commission_amount: number;
  total: number;
};

const TIER_CONFIG = {
  economico: {
    label: "Esencial",
    subtitle: "Sonido decente, precio accesible",
    icon: Zap,
    color: "emerald",
    bgCard: "bg-white",
    borderCard: "border-gray-200",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700",
    badge: null,
  },
  recomendado: {
    label: "Recomendado",
    subtitle: "Mejor balance calidad-precio",
    icon: Star,
    color: "blue",
    bgCard: "bg-white",
    borderCard: "border-blue-500",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    badge: "Mejor valor",
  },
  premium: {
    label: "Experiencia Total",
    subtitle: "Sonido de concierto profesional",
    icon: Crown,
    color: "purple",
    bgCard: "bg-white",
    borderCard: "border-purple-200",
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    accentBorder: "border-purple-200",
    buttonBg: "bg-purple-600 hover:bg-purple-700",
    badge: "Premium",
  },
};

export default function ProposalView({
  request,
  proposals,
}: {
  request: AdvisoryRequestView;
  proposals: AdvisoryProposalView[];
}) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const cart = useCart();

  // Si no hay propuestas, mostrar estado de espera
  if (!proposals || proposals.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-black animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-4">ArtRider está buscando la mejor opción</h2>
        <p className="text-gray-500 max-w-md">
          Nuestro equipo está armando el rider técnico perfecto para tu evento de {request.guest_count} personas. 
          Te notificaremos en cuanto tengamos la propuesta lista.
        </p>
      </div>
    );
  }

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Ordenar tiers: economico, recomendado, premium
  const tierOrder = ["economico", "recomendado", "premium"];
  const sortedProposals = [...proposals].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  const handleSelectPlan = async (proposal: AdvisoryProposalView) => {
    if (!request.event_date) {
      alert("La propuesta no tiene una fecha de evento válida.");
      return;
    }

    setSelectedTier(proposal.id);
    setIsProcessing(true);

    try {
      // 1. Aceptar la propuesta en el servidor
      const result = await acceptProposal(proposal.id);
      if (!result.success) {
        alert("Error: " + result.error);
        return;
      }

      // 2. Reemplazar el carrito con los items de la propuesta
      cart.replaceWithAdvisory(
        proposal.items.map((item) => ({
          listingId: item.listing_id,
          title: item.title,
          dailyPrice: item.unit_price,
          quantity: item.quantity,
        })),
        request.event_date,
        proposal.id,
      );

      // 3. Ir al carrito
      router.push("/cart");
    } catch (err) {
      console.error(err);
      alert("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
      setSelectedTier(null);
    }
  };

  // Contar equipos por categoría en los metrics
  const countAudioItems = (items: ProposalItem[]) =>
    items.filter(i => i.note?.toLowerCase().includes("audio")).reduce((sum, i) => sum + i.quantity, 0);
  const countLightItems = (items: ProposalItem[]) =>
    items.filter(i => i.note?.toLowerCase().includes("iluminación") || i.note?.toLowerCase().includes("luminaria")).reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-sm font-bold tracking-wider text-green-600 uppercase">Propuestas Listas</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Elige tu experiencia sonora</h1>
        <p className="text-gray-500 text-lg">
          {sortedProposals.length} {sortedProposals.length === 1 ? "opción pensada" : "opciones pensadas"} para tu evento de <strong>{request.guest_count} personas</strong>
        </p>
      </div>

      {/* Tier Cards */}
      <div className={`grid gap-6 ${
        sortedProposals.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
        sortedProposals.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto" :
        "grid-cols-1 md:grid-cols-3"
      }`}>
        {sortedProposals.map((proposal) => {
          const config = TIER_CONFIG[proposal.tier] || TIER_CONFIG.recomendado;
          const Icon = config.icon;
          const isRecomendado = proposal.tier === "recomendado";
          const isSelected = selectedTier === proposal.id;
          const items = proposal.items || [];

          return (
            <div
              key={proposal.id}
              className={`relative rounded-3xl border-2 ${config.borderCard} ${config.bgCard} shadow-sm overflow-hidden flex flex-col transition-transform duration-300 ${
                isRecomendado ? "md:scale-105 md:shadow-xl z-10 hover:scale-[1.07]" : "hover:shadow-lg hover:scale-105"
              }`}
            >
              {/* Badge */}
              {config.badge && (
                <div className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold tracking-wide ${
                  isRecomendado ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {config.badge}
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Tier Header */}
                <div className="mb-5">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-3 ${config.accentBg} ${config.accentText}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>
                  <p className="text-sm text-gray-500">
                    {config.subtitle}
                  </p>
                </div>

                {/* Precio */}
                <div className="mb-5">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatMoney(proposal.total)}
                  </span>
                  <span className="text-sm ml-1 text-gray-500">
                    /día
                  </span>
                </div>

                {/* Items List */}
                <div className="flex-1 space-y-2.5 mb-6">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <span>
                        <strong>{item.quantity}x</strong> {item.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Metrics Pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {items.flatMap(item => 
                    (item.metrics || []).slice(0, 2).map((metric, i) => (
                      <span
                        key={`${item.listing_id}-${i}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.accentBg} ${config.accentText} border ${config.accentBorder}`}
                      >
                        {metric}
                      </span>
                    ))
                  )}
                </div>

                {/* Desglose */}
                <div className="text-xs space-y-1 mb-5 pt-4 border-t border-gray-100 text-gray-500">
                  <div className="flex justify-between">
                    <span>Subtotal equipos</span>
                    <span>{formatMoney(proposal.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Servicio ArtRider</span>
                    <span>{formatMoney(proposal.commission_amount)}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(proposal)}
                  disabled={isProcessing}
                  className={`w-full font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${config.buttonBg} text-white`}
                >
                  {isProcessing && isSelected ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Elegir plan
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Badge */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-3 items-start">
          <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-700 font-medium">Equipos verificados y garantizados</p>
            <p className="text-xs text-gray-500 mt-1">
              Todos los equipos son provistos por proveedores verificados de ArtRider. 
              Garantizamos disponibilidad, funcionamiento y soporte técnico.
            </p>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="text-center">
        <button className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors font-medium">
          <HelpCircle className="w-4 h-4" /> ¿Necesitas ayuda para elegir?
        </button>
      </div>
    </div>
  );
}
