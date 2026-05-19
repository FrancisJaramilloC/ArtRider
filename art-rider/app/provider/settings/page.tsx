//  Pagina de ajustes del proveedor
export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/*  Header  */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Ajustes de Empresa</h2>
        <p className="text-[0.95rem] text-gray-500 mt-1">
          Configura cómo te ven otros usuarios al rentar tus equipos y administra la identidad de tu marca.
        </p>
      </div>

      <div className="space-y-6">

        {/*  Card: Informacion publica  */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-semibold text-gray-900">Información Pública</h3>
            <p className="text-sm text-gray-500 mt-0.5">Estos datos serán visibles en tus listados de equipos.</p>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/*  Input: Nombre de marca o productora  */}
            <div className="grid gap-2">
              <label htmlFor="brandName" className="text-sm font-medium text-gray-700">Nombre de tu Marca o Productora</label>
              <input 
                type="text" 
                id="brandName" 
                placeholder="Ej. EJ Audiovisuales"
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm"
              />
              <p className="text-[0.8rem] text-gray-500">Puedes usar tu nombre personal si no tienes una marca registrada.</p>
            </div>

            {/*  Input: Ubicacion principal  */}
            <div className="grid gap-2">
              <label htmlFor="location" className="text-sm font-medium text-gray-700">Ubicación Principal</label>
              <select 
                id="location" 
                defaultValue="quito"
                className="flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm appearance-none"
              >
                <option value="quito">Quito, Pichincha</option>
                <option value="guayaquil">Guayaquil, Guayas</option>
                <option value="cuenca">Cuenca, Azuay</option>
                <option value="loja">Loja, Loja</option>
              </select>
            </div>

            {/*  Input: Biografia / Descripcion  */}
            <div className="grid gap-2">
              <label htmlFor="bio" className="text-sm font-medium text-gray-700">Biografía / Descripción</label>
              <textarea 
                id="bio" 
                rows={4}
                placeholder="Cuéntale a la comunidad sobre tu experiencia, el estado de tus equipos y tus especialidades..."
                className="flex w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#875B9A] focus:border-transparent transition-all shadow-sm resize-y"
              ></textarea>
              <p className="text-[0.8rem] text-gray-500 text-right">0 / 500 caracteres</p>
            </div>

          </div>
          
          <div className="p-  5 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button className="bg-[#875B9A] hover:bg-[#6a437a] text-white px-6 py-2.5 rounded-full text-[0.95rem] font-semibold transition-colors shadow-sm">
              Guardar cambios
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
