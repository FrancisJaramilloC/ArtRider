"use client";

export function HowItWorks() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title — unified scale */}
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-10">
          Cómo funciona
        </h2>

        {/* Horizontal 3-Step Flow — ultra-minimal */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
          
          {/* Step 1 */}
          <div className="flex items-center gap-3 flex-1">
            <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center shrink-0">1</span>
            <span className="text-[0.95rem] font-medium text-gray-900">Explora equipos</span>
          </div>

          {/* Arrow */}
          <svg className="hidden md:block w-6 h-6 text-gray-300 shrink-0 mx-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>

          {/* Step 2 */}
          <div className="flex items-center gap-3 flex-1">
            <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center shrink-0">2</span>
            <span className="text-[0.95rem] font-medium text-gray-900">Reserva al instante</span>
          </div>

          {/* Arrow */}
          <svg className="hidden md:block w-6 h-6 text-gray-300 shrink-0 mx-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>

          {/* Step 3 */}
          <div className="flex items-center gap-3 flex-1">
            <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center shrink-0">3</span>
            <span className="text-[0.95rem] font-medium text-gray-900">Crea tu evento</span>
          </div>

        </div>

      </div>
    </section>
  );
}
