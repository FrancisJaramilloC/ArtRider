/** Estado vacío cuando no hay listings con ubicación */
export function EmptyState() {
  return (
    <div className="text-center py-20 px-6">
      <svg
        className="mx-auto mb-4 text-zinc-700"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
      <p className="text-sm font-medium text-zinc-400">
        No hay equipos con ubicación
      </p>
      <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
        Los equipos aparecerán aquí cuando tengan una dirección asignada.
      </p>
    </div>
  );
}
