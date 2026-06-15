/**
 * app/listings/loading.tsx
 *
 * Mostrado por Next.js automáticamente mientras listings/page.tsx se está transmitiendo.
 * Renderiza una cuadrícula de tarjetas esqueleto que reflejan exactamente las dimensiones de
 * ListingCard para que el diseño no cambie cuando lleguen los datos reales.
 *
 * Este es un componente del servidor - no se necesita "use client"
 */

// Numero de tarjetas skeleton a mostrar - coincide con una cuadrícula típica
const SKELETON_COUNT = 6;

function SkeletonCard() {
  return (
    <div
      className="listing-card overflow-hidden"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {/*  Placeholder de imagen  */}
      <div
        className="skeleton"
        style={{ height: "176px", borderRadius: "16px 16px 0 0" }}
      />

      {/*  Body  */}
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/*  Titulo  */}
        <div className="skeleton" style={{ height: "16px", width: "75%" }} />
        {/*  Subtitulo  */}
        <div className="skeleton" style={{ height: "12px", width: "50%" }} />

        {/*  Divider  */}
        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "2px 0" }} />

        {/*  Ubicación + fila de precio  */}
        <div className="flex justify-between items-center">
          <div className="skeleton" style={{ height: "12px", width: "40%" }} />
          <div className="skeleton" style={{ height: "20px", width: "28%" }} />
        </div>
      </div>
    </div>
  );
}

//  Componente principal de la pagina de reservas
export default function ListingsLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        paddingBottom: "80px",
      }}
    >
      {/* Header skeleton */}
      <header
        style={{
          padding: "56px 24px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div className="skeleton" style={{ height: "20px", width: "120px", borderRadius: "999px" }} />
        <div className="skeleton" style={{ height: "40px", width: "280px" }} />
        <div className="skeleton" style={{ height: "14px", width: "420px" }} />
        <div
          style={{
            marginTop: "18px",
            height: "1px",
            background: "linear-gradient(90deg, var(--primary-500) 0%, transparent 70%)",
          }}
        />
      </header>

      {/* Grid skeleton */}
      <section
        aria-label="Loading listings…"
        aria-busy="true"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
          gap: "24px",
        }}
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </section>
    </main>
  );
}
