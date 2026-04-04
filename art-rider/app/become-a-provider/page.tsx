import Link from "next/link";

export default function BecomeProviderLanding() {
  return (
    <div className="flex-1 flex flex-col items-center animate-in fade-in duration-700">
      
      {/* ── Hero Content ── */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-8">
          Pon a trabajar tus<br/> 
          <span className="text-[#875B9A]">equipos creativos</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium mb-12">
          Convierte tus equipos de audio, iluminación y video que no estás utilizando diariamente en una fuente de ingresos adicional.
        </p>
        
        {/* Earnings Estimator Mock */}
        <div className="w-full max-w-xl mx-auto bg-white border border-gray-200 rounded-3xl p-8 shadow-xl mb-12 shadow-gray-200/50">
          <p className="text-gray-500 font-medium mb-2">Puedes ganar hasta</p>
          <div className="text-6xl font-black text-gray-900 tracking-tight mb-4">$450 <span className="text-2xl font-semibold text-gray-400">/ mes</span></div>
          <p className="text-sm text-gray-400">
            Estimación basada en alquileres locales de equipos de cámara y lentes similares a tu zona.
          </p>
        </div>

        <Link
          href="/become-a-provider/onboarding"
          className="bg-[#875B9A] hover:bg-[#6a437a] text-white px-10 py-5 rounded-2xl text-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/20"
        >
          ¡Comienza ahora gratis!
        </Link>
      </section>

      {/* ── ArtRider Cover (Guarantees) ── */}
      <section className="w-full border-t border-gray-100 bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">ArtRider Cover</h2>
            <p className="text-xl text-gray-500">Protección de primera clase integrada en cada alquiler.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-[#875B9A]">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Protección de daños</h3>
              <p className="text-gray-500 leading-relaxed">
                Reembolsamos hasta $5,000 en caso de roturas, daños o accidentes, gracias a nuestro sistema de seguros integrado.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-[#875B9A]">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Usuarios verificados</h3>
              <p className="text-gray-500 leading-relaxed">
                Cada usuario pasa por un riguroso sistema que verifica su identidad (KYC) antes de poder operar en la plataforma.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-[#875B9A]">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Soporte 24/7</h3>
              <p className="text-gray-500 leading-relaxed">
                Nuestro equipo especializado está disponible a cualquier hora del día para respaldarte durante transacciones.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
