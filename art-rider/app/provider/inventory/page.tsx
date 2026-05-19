import { Layers, Box, Hexagon, Search, Plus } from "lucide-react";

// pagina del inventario del proveedor
export default function InventoryPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full">

      {/*  Header  */}
      <div>
        <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight">Mi catálogo</h1>
        <p className="text-[0.95rem] text-gray-500 mt-1 font-medium">
          Gestiona tus equipos y paquetes publicados
        </p>
      </div>

      {/*  KPI Cards (Key Performance Indicators - Indicadores Clave de Rendimiento)  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/*  Total items  */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500">Total de items</span>
            <span className="text-3xl font-bold text-gray-900">0</span>
          </div>
          <div className="p-2 rounded-lg bg-gray-50 text-gray-400">
            <Layers className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>

        {/*  Stock total  */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500">Stock total</span>
            <span className="text-3xl font-bold text-gray-900">0</span>
          </div>
          <div className="p-2 rounded-lg bg-gray-50 text-gray-400">
            <Box className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>

        {/* Paquetes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-500">Paquetes</span>
            <span className="text-3xl font-bold text-gray-900">0</span>
          </div>
          <div className="p-2 rounded-lg bg-gray-50 text-gray-400">
            <Hexagon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>

      </div>

      {/*  Tabs - Equipos y Paquetes  */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <a
            href="#"
            className="border-gray-900 text-gray-900 whitespace-nowrap border-b-[3px] py-3 px-1 text-[0.95rem] font-bold"
            aria-current="page"
          >
            Equipos (0)
          </a>
          <a
            href="#"
            className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 whitespace-nowrap border-b-[3px] py-3 px-1 text-[0.95rem] font-medium transition-colors"
          >
            Paquetes (0)
          </a>
        </nav>
      </div>

      {/*  Barra de búsqueda  */}
      <div className="relative max-w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-[18px] w-[18px] text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar paquetes..."
          className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all shadow-sm"
        />
      </div>

      {/*  Grid  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
        
        {/*  Crear nuevo paquete  */}
        <button className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 aspect-video w-full group py-16">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm group-hover:scale-105 group-hover:shadow transition-all">
            <Plus className="w-5 h-5 text-gray-500 group-hover:text-gray-900" strokeWidth={2} />
          </div>
          <span className="font-semibold text-[0.95rem] text-gray-700 group-hover:text-gray-900">Crear nuevo paquete</span>
        </button>

      </div>

    </div>
  );
}
