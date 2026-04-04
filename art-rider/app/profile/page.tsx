export default function PersonalInfoPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Información Personal</h2>
        <p className="text-[0.95rem] text-gray-500 mt-1">
          Administra tus datos privados y de contacto.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Avatar Section ── */}
        <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center shadow-md shrink-0">
            <span className="text-2xl font-bold text-white tracking-widest">EJ</span>
          </div>
          <div>
            <button className="text-[0.95rem] font-semibold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full transition-colors shadow-sm">
              Cambiar foto
            </button>
            <p className="text-sm text-gray-400 mt-2">JPG o PNG. Máximo 2MB.</p>
          </div>
        </div>

        {/* ── Form Card: Datos Básicos ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-semibold text-gray-900">Datos Básicos</h3>
            <p className="text-sm text-gray-500 mt-0.5">La información principal asociada a tu cuenta.</p>
          </div>
          <div className="p-6 space-y-5">
            
            <div className="grid gap-2">
              <label htmlFor="fullName" className="text-sm font-medium text-gray-700">Nombre Completo</label>
              <input 
                type="text" 
                id="fullName" 
                defaultValue="Emilio Jaramillo"
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input 
                type="email" 
                id="email" 
                defaultValue="emilio@ejemplo.com"
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-500"
                disabled
              />
              <p className="text-[0.8rem] text-gray-500">Para cambiar tu correo electrónico, comunícate con soporte.</p>
            </div>

            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-medium text-gray-700">Número de Teléfono</label>
              <div className="flex">
                <span className="flex items-center justify-center px-4 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-xl text-sm font-medium">+593</span>
                <input 
                  type="tel" 
                  id="phone" 
                  defaultValue="098 765 4321"
                  className="flex h-11 w-full rounded-r-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

          </div>
          
          <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button className="bg-[#875B9A] hover:bg-[#6a437a] text-white px-6 py-2.5 rounded-full text-[0.95rem] font-semibold transition-colors shadow-sm">
              Guardar cambios
            </button>
          </div>
        </div>

        </div>

        {/* ── Secciones Adicionales (Airbnb Style) ── */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition-colors group">
            <div className="text-gray-900 group-hover:text-[#875B9A] transition-colors">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <line x1="9" y1="10" x2="15" y2="10"></line>
                <line x1="12" y1="10" x2="12" y2="10.01"></line>
              </svg>
            </div>
            <div>
              <h3 className="text-[1.05rem] font-semibold text-gray-900">Reseñas escritas por mí</h3>
              <p className="text-sm text-gray-500">Visualiza las reseñas que has dejado a otros usuarios o equipos.</p>
            </div>
            <div className="ml-auto">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>

      </div>
  );
}
