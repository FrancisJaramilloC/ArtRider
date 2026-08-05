"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useRouter } from "next/navigation";
import SignatureModal from "./SignatureModal";
import { signProposalRider } from "@/services/advisoryService";
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
  items: ProposalItem[];
  subtotal: number;
  commission_amount: number;
  total: number;
};

export default function ProposalView({
  request,
  proposal,
}: {
  request: AdvisoryRequestView;
  proposal: AdvisoryProposalView | null;
}) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const cart = useCart();

  // GC-012: Si no hay propuesta o no está en estado de ser mostrada al cliente
  if (!proposal) {
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

  const handleAcceptAndPay = () => {
    if (!acceptedTerms) return;
    setIsModalOpen(true);
  };

  const handleSignatureSave = async (base64Signature: string) => {
    setIsProcessing(true);
    setIsModalOpen(false);
    
    try {
      // 1. Generate PDF
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("RIDER TÉCNICO & CONTRATO", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`ID de Propuesta: ${proposal.id}`, 20, 30);
      doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 20, 40);
      
      doc.setFontSize(14);
      doc.text("Equipos Acordados:", 20, 60);
      
      let y = 70;
      items.forEach((item: ProposalItem) => {
        doc.setFontSize(12);
        doc.text(`- ${item.quantity}x ${item.title} ($${(item.unit_price / 100).toFixed(2)} c/u)`, 20, y);
        y += 10;
        if (item.note) {
          doc.setFontSize(10);
          doc.text(`  Nota: ${item.note}`, 20, y);
          y += 10;
        }
      });
      
      y += 10;
      doc.setFontSize(14);
      doc.text(`Total a Pagar: ${formatMoney(proposal.total)}`, 20, y);
      
      y += 20;
      doc.setFontSize(12);
      doc.text("El cliente acepta los terminos y condiciones, y confirma que los requerimientos", 20, y);
      doc.text("tecnicos descritos satisfacen las necesidades de su evento.", 20, y + 10);
      
      y += 30;
      doc.text("Firma del Cliente:", 20, y);
      doc.addImage(base64Signature, "PNG", 20, y + 10, 80, 40);
      
      const pdfBlob = doc.output('blob');
      
      // 2. FormData para Server Action
      const formData = new FormData();
      formData.append("proposalId", proposal.id);
      formData.append("pdfFile", pdfBlob, `rider-${proposal.id}.pdf`);
      
      const result = await signProposalRider(formData);
      
      if (result.success) {
        if (!request.event_date) {
          alert("La propuesta no tiene una fecha de evento válida.");
          return;
        }
        cart.replaceWithAdvisory(
          items.map((item: ProposalItem) => ({
            listingId: item.listing_id,
            title: item.title,
            dailyPrice: item.unit_price,
            quantity: item.quantity,
          })),
          request.event_date,
          proposal.id,
        );
        router.push("/cart");
      } else {
        alert("Error al firmar: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error inesperado al generar el contrato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const items: ProposalItem[] = proposal.items || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Detalles de la Propuesta */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <span className="text-sm font-bold tracking-wider text-green-500 uppercase">Propuesta Lista</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Tenemos la mejor opción para tu evento</h1>
          <p className="text-gray-500 mb-8">
            Basado en tu requerimiento técnico, hemos ensamblado el equipo ideal.
          </p>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 border rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  {item.note && <p className="text-sm text-gray-500 mt-1">{item.note}</p>}
                  
                  {item.metrics && item.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.metrics.map((metric, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {metric}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-sm bg-gray-100 px-3 py-1 rounded-md inline-block font-medium">
                    Cantidad Asignada: {item.quantity}
                  </div>
                </div>
                <div className="text-right flex flex-col justify-center">
                  <span className="font-bold text-lg">{formatMoney(item.unit_price * item.quantity)}</span>
                  <span className="text-xs text-gray-400">{formatMoney(item.unit_price)} c/u</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-2xl flex gap-3 text-blue-800 text-sm">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <p>
              Todos los equipos son provistos por proveedores verificados de ArtRider.
              Garantizamos la disponibilidad y el funcionamiento.
            </p>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Resumen de Pago */}
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
          <h3 className="text-xl font-bold mb-6">Resumen de Inversión</h3>
          
          <div className="space-y-4 text-sm mb-6 border-b pb-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal equipos</span>
              <span>{formatMoney(proposal.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tarifa de servicio ArtRider</span>
              <span>{formatMoney(proposal.commission_amount)}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-8">
            <span className="font-semibold text-gray-600">Total a pagar</span>
            <span className="text-3xl font-bold">{formatMoney(proposal.total)}</span>
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-1">
              <input 
                type="checkbox" 
                className="peer w-5 h-5 appearance-none border-2 border-gray-300 rounded-md checked:bg-black checked:border-black transition-colors cursor-pointer"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <CheckCircle2 className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100" />
            </div>
            <span className="text-sm text-gray-600 group-hover:text-black transition-colors">
              He leído y acepto los <Link href="/terminos" className="underline">términos y condiciones</Link> y el rider técnico propuesto.
            </span>
          </label>

          <button
            onClick={handleAcceptAndPay}
            disabled={!acceptedTerms || isProcessing}
            className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Firmar y agregar al carrito"}
          </button>

          <button className="w-full bg-white border-2 border-gray-200 text-black font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4" /> Necesito ayuda
          </button>
        </div>
      </div>

      <SignatureModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSignatureSave}
      />
    </div>
  );
}
