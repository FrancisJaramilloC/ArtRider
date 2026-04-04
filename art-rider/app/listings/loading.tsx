/**
 * app/listings/loading.tsx
 *
 * Shown by Next.js automatically while listings/page.tsx is streaming.
 * Renders a grid of skeleton cards that exactly mirror the dimensions of
 * ListingCard so the layout doesn't shift when real data arrives.
 *
 * This is a Server Component — no "use client" needed.
 */

// Number of skeleton cards to show — matches a typical above-the-fold grid
const SKELETON_COUNT = 6;

function SkeletonCard() {
  return (
    <div
      className="listing-card overflow-hidden"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      {/* Image placeholder */}
      <div
        className="skeleton"
        style={{ height: "176px", borderRadius: "16px 16px 0 0" }}
      />

      {/* Body */}
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Title */}
        <div className="skeleton" style={{ height: "16px", width: "75%" }} />
        {/* Subtitle */}
        <div className="skeleton" style={{ height: "12px", width: "50%" }} />

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "2px 0" }} />

        {/* Location + price row */}
        <div className="flex justify-between items-center">
          <div className="skeleton" style={{ height: "12px", width: "40%" }} />
          <div className="skeleton" style={{ height: "20px", width: "28%" }} />
        </div>
      </div>
    </div>
  );
}

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
