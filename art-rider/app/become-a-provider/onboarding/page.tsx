"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-12 pb-24 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Progress Bar */}
      <div className="w-full max-w-2xl px-6 mb-12">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-500">Paso {step} de 4</span>
          {step < 4 && <span className="text-sm font-medium text-[#875B9A]">A continuación: {step === 1 ? "Categorías" : step === 2 ? "Verificación" : "¡Listo!"}</span>}
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#875B9A] transition-all duration-500 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* ── Form Container ── */}
      <div className="w-full max-w-2xl px-6 flex-1 flex flex-col">
        
        {/* STEP 1: Basic Info & Address */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-2">Configura tu perfil de Proveedor</h2>
              <p className="text-lg text-gray-500">Estos detalles ayudarán a los clientes a confiar en tu negocio y a ubicar tus equipos.</p>
            </div>
            
            <div className="space-y-5">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-900">Nombre de tu Marca o Bodega</label>
                <input 
                  type="text" 
                  placeholder="Ej. Audiovisuales Pro"
                  className="flex h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all"
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Dirección Principal (Obligatorio)</h3>
                
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">Calle Principal y Secundaria</label>
                    <input 
                      type="text" 
                      placeholder="Av. 12 de Octubre y Patria"
                      className="flex h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700">Ciudad</label>
                      <input 
                        type="text" 
                        placeholder="Quito"
                        className="flex h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-gray-700">Provincia / Estado</label>
                      <input 
                        type="text" 
                        placeholder="Pichincha"
                        className="flex h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-700">Código Postal (ZIP)</label>
                    <input 
                      type="text" 
                      placeholder="170143"
                      className="flex h-12 w-full rounded-xl border border-gray-300 px-4 py-2 text-[0.95rem] focus:outline-none focus:ring-2 focus:ring-[#875B9A] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Categories */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-2">¿Qué tipo de equipos alquilarás principalmente?</h2>
              <p className="text-lg text-gray-500">Puedes seleccionar una o más especificaciones. Esto nos ayuda a posicionar tu perfil.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Audio', 'Iluminación', 'Cámaras y Video', 'Efectos Especiales', 'Mobiliario DJ', 'Energía y Cables'].map((cat) => (
                <label key={cat} className="flex items-center gap-4 p-4 border border-gray-200 rounded-2xl cursor-pointer hover:border-[#875B9A] transition-all hover:bg-purple-50/30 has-[:checked]:border-[#875B9A] has-[:checked]:bg-purple-50/50">
                  <input type="checkbox" className="w-5 h-5 text-[#875B9A] rounded focus:ring-[#875B9A]" />
                  <span className="font-semibold text-gray-900">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Identity Verification (KYC) */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mb-2">Verificación de Identidad</h2>
              <p className="text-lg text-gray-500">Por seguridad de la comunidad ArtRider, todos los proveedores deben subir un documento de identidad oficial. Tu estado será "Pendiente" hasta ser aprobado manualmente.</p>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-500 group-hover:text-[#875B9A]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Haz clic para subir tu documento</h3>
              <p className="text-sm text-gray-500">Soporta JPG, PNG, PDF. Frente y reverso.</p>
            </div>

            <div className="bg-blue-50 text-blue-900 p-4 rounded-xl flex gap-3 text-sm">
              <span className="text-xl">🛈</span>
              <p>Tu información es procesada de forma segura bajo estrictos estándares de encriptación (Stripe Identity) y nunca será compartida con terceros.</p>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 text-green-600">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">¡Solicitud recibida!</h2>
            <p className="text-xl text-gray-500 max-w-md mx-auto mb-8">
              Tu perfil de proveedor se encuentra en estado <span className="font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md">Pendiente de revisión</span>. Te avisaremos cuando se apruebe.
            </p>
            <p className="text-gray-600 mb-8">Mientras tanto, puedes acceder a tu Panel de Proveedor para empezar a añadir tu inventario de equipos. Serán visibles al público tan pronto como tu cuenta se verifique totalmente.</p>
          </div>
        )}

        {/* ── Fixed Footer Controls ── */}
        <div className="mt-auto pt-10 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button 
              onClick={handleBack}
              className="text-gray-900 font-semibold hover:bg-gray-100 px-6 py-3 rounded-full transition-colors underline decoration-2 underline-offset-4"
            >
              Atrás
            </button>
          ) : (
            <div></div> // Placeholder to keep alignment
          )}

          <button 
            onClick={handleNext}
            className={`bg-[#875B9A] hover:bg-[#6a437a] text-white px-8 py-4 rounded-xl text-[1.1rem] font-bold transition-all shadow-md ${step === 4 ? 'w-full md:w-auto' : ''}`}
          >
            {step === 1 ? 'Continuar' : step === 3 ? 'Enviar Solicitud' : step === 4 ? 'Ir a mi Panel de Proveedor' : 'Siguiente'}
          </button>
        </div>

      </div>
    </div>
  );
}
