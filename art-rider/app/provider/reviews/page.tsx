import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  getProviderReviews,
  getAverageRatingForProvider,
  type ReviewWithMeta,
} from "@/services/reviewService";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function timeAgo(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  if (days < 1) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 14) return "Hace 1 semana";
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} mes${months > 1 ? "es" : ""}`;
  return `Hace ${Math.floor(days / 365)} año${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={star <= filled ? "#F59E0B" : "#E5E7EB"}
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewWithMeta }) {
  const initial = (review.reviewer_name ?? "U").charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3 hover:border-gray-200 transition-colors">
      {/* Reviewer */}
      <div className="flex items-center gap-3">
        {review.reviewer_avatar ? (
          <img
            src={review.reviewer_avatar}
            alt={review.reviewer_name ?? "Usuario"}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#F0E8F5] flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[#875B9A] select-none">{initial}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {review.reviewer_name ?? "Cliente verificado"}
          </p>
          <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StarRow rating={review.rating} size={13} />
        </div>
      </div>

      {/* Equipo */}
      {review.listing_title && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#875B9A] bg-[#F9F5FB] px-2.5 py-1 rounded-full w-fit">
          {review.listing_title}
        </p>
      )}

      {/* Texto */}
      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

      {/* Fecha */}
      <p className="text-xs text-gray-400">{fmtDate(review.created_at)}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F0E8F5] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#875B9A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <p className="font-semibold text-gray-900 text-base">Aún no tienes reseñas</p>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">
        Cuando tus clientes completen reservas y dejen una reseña, aparecerán aquí.
      </p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default async function ReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let reviews: ReviewWithMeta[] = [];
  let avgRating = 0;

  if (user) {
    [reviews, avgRating] = await Promise.all([
      getProviderReviews(user.id),
      getAverageRatingForProvider(user.id),
    ]);
  }

  const totalReviews = reviews.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full">

      {/* Header */}
      <div>
        <h1 className="text-[2rem] font-bold text-gray-900 tracking-tight">Reseñas</h1>
        <p className="text-[0.95rem] text-gray-500 mt-1 font-medium">
          Descubre lo que tus clientes dicen sobre tus productos y servicios.
        </p>
      </div>

      {/* Resumen */}
      {totalReviews > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-5xl font-bold text-gray-900 leading-none">
              {avgRating.toFixed(1)}
            </span>
            <StarRow rating={avgRating} size={16} />
            <p className="text-xs text-gray-500 mt-1">
              {totalReviews} reseña{totalReviews !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Distribución por estrellas */}
          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => Math.round(r.rating) === star).length;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3 shrink-0">{star}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden="true" className="shrink-0">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-4 shrink-0 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de reseñas */}
      {totalReviews === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

    </div>
  );
}
