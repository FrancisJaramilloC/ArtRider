/*
 * Layout para la sección de mensajes
 * Proporciona la estructura de dos columnas: bandeja de entrada y chat
 */

import type { Metadata } from "next";

// Metadata de la pagina
export const metadata: Metadata = {
  title: "Mensajes | ArtRider",
  description: "Mensajes privados con otros usuarios de ArtRider.",
};

// Componente de layout de mensajes
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Bandeja de entrada */}
      <div className="w-1/3 border-r border-gray-200 bg-white">Bandeja de entrada</div>
      
      {/* Chat */}
      <div className="flex-1">{children}</div>
    </div>
  );
}