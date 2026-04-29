"use client";

export default function HeroSection() {
  return (
    <section className="bg-white px-4 sm:px-6 lg:px-8 py-12 text-center flex flex-col items-center">
      <div className="max-w-[800px] w-full relative">
        {/* ── Main headline ── */}
        <h1 className="text-2xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
      Encuentra el equipo perfecto para <br className="hidden md:block" />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
        tu evento
      </span>
      </h1>
        {/* ── Subtitle ── */}
        <p className="text-sm text-gray-500 leading-relaxed max-w-[600px] mx-auto mb-8">
          Audio, iluminación y video profesional. Reserva equipos de alta calidad con propietarios verificados.
        </p>

        {/* ── Simple Single-Input Search Bar (WP Style) ── */}
        <div className="mx-auto max-w-[600px] relative">
          <div className="flex items-center bg-[#f8f9fa] border border-transparent hover:border-gray-200 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)] rounded-full h-[56px] px-6 transition-all duration-300">
            {/* Search Icon */}
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-gray-500 mr-4 shrink-0"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>

            {/* Input Field */}
            <input 
              type="text" 
              placeholder="¿Qué equipo o paquete buscas?" 
              className="bg-transparent border-none outline-none text-[1rem] text-gray-900 placeholder-gray-500 w-full h-full focus:ring-0"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
