"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, Calendar, Star, X, Check, ChevronRight,
} from "lucide-react";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";
import { cancelBooking } from "@/services/bookingsService";
import { createClientReview } from "@/services/reviewService";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;

const CAT_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", advertising: "Publicidad", other: "Otro",
};

type Tone = "ok" | "warn" | "danger" | "muted";
type TabId = "todas" | "activas" | "completadas" | "canceladas";

const STATUS_CONFIG: Record<BookingStatus, { label: string; tone: Tone; tab: TabId }> = {
  AWAITING_SIGNATURES: { label: "Enviado al proveedor", tone: "warn",   tab: "activas"     },
  PAID:                { label: "Aprobado / Pagado",    tone: "ok",     tab: "activas"     },
  ACTIVE:              { label: "Activo",               tone: "ok",     tab: "activas"     },
  COMPLETED:           { label: "Completado",           tone: "muted",  tab: "completadas" },
  DISPUTE:             { label: "En disputa",           tone: "danger", tab: "canceladas"  },
  CANCELLED:           { label: "Cancelado",            tone: "danger", tab: "canceladas"  },
  ARCHIVED:            { label: "Archivado",            tone: "muted",  tab: "todas"       },
};

const TONE_STYLES: Record<Tone, string> = {
  ok:     "bg-[#e6f6ed] text-[#157a45]",
  warn:   "bg-[#fdf2df] text-[#a06a0c]",
  danger: "bg-[#fdeaec] text-[#bd2c45]",
  muted:  "bg-[#edebf0] text-[#5b5567]",
};

const TABS: { id: TabId; label: string }[] = [
  { id: "todas",       label: "Todas"       },
  { id: "activas",     label: "Activas"     },
  { id: "completadas", label: "Completadas" },
  { id: "canceladas",  label: "Canceladas"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (start === end) return fmtDate(start);
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${s.getUTCDate()} – ${e.getUTCDate()} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function countDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.ceil(ms / 86_400_000) + 1;
  return days > 0 ? days : 1;
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function peso(cents: number): string {
  const dollars = cents / 100;
  return "$" + (Number.isInteger(dollars) ? dollars.toString() : dollars.toFixed(2));
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-[7px] text-[11.5px] font-extrabold tracking-wide uppercase px-[12px] py-[6px] rounded-full ${TONE_STYLES[tone]}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current flex-shrink-0" />
      {label}
    </span>
  );
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

function CancelModal({
  booking,
  providerName,
  onClose,
  onConfirm,
  isPending,
}: {
  booking: BookingWithDetails;
  providerName: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const unit = booking.booking_units[0];
  const cover = unit?.listing?.image_urls?.[0] ?? null;
  const title = unit?.listing?.title ?? "Equipo alquilado";

  return (
    <div
      className="fixed inset-0 bg-[rgba(22,19,28,.5)] backdrop-blur-[2px] z-[90] grid place-items-center p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-[20px] shadow-[0_12px_34px_-10px_rgba(22,19,28,.22),0_2px_6px_rgba(22,19,28,.06)] overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-gray-100">
          <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">Cancelar reserva</h3>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-[38px] h-[38px] rounded-full grid place-items-center hover:bg-gray-50 transition-colors text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-[22px]">
          <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl mb-[18px]">
            <div className="w-[54px] h-[54px] rounded-[9px] overflow-hidden bg-gray-100 flex-shrink-0">
              {cover ? (
                <Image src={cover} alt={title} width={54} height={54} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div>
              <strong className="block text-[14px] font-bold text-gray-900">{title}</strong>
              <span className="text-[12.5px] text-gray-400 font-medium">
                {fmtDateRange(booking.start_date, booking.end_date)} · {peso(booking.total_price)}
              </span>
            </div>
          </div>
          <p className="text-[14px] text-gray-600 font-medium leading-[1.55]">
            ¿Seguro que quieres cancelar esta reserva? Según la política de cancelación de{" "}
            <strong className="text-gray-900">SafeRider</strong>, el reembolso dependerá de la
            anticipación con la que canceles.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-[10px] px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-900 transition-colors disabled:opacity-50">
            Volver
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-[#f3c9d0] text-[#bd2c45] hover:bg-[#fdeaec] hover:border-[#e89aa6] transition-colors disabled:opacity-50">
            {isPending ? "Cancelando…" : "Sí, cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({
  booking,
  onClose,
  onSubmit,
  isPending,
}: {
  booking: BookingWithDetails;
  onClose: () => void;
  onSubmit: (rating: number, text: string) => void;
  isPending: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const unit = booking.booking_units[0];
  const cover = unit?.listing?.image_urls?.[0] ?? null;
  const title = unit?.listing?.title ?? "Equipo alquilado";

  return (
    <div
      className="fixed inset-0 bg-[rgba(22,19,28,.5)] backdrop-blur-[2px] z-[90] grid place-items-center p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-[20px] shadow-[0_12px_34px_-10px_rgba(22,19,28,.22),0_2px_6px_rgba(22,19,28,.06)] overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-gray-100">
          <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">Dejar reseña</h3>
          <button onClick={onClose} aria-label="Cerrar"
            className="w-[38px] h-[38px] rounded-full grid place-items-center hover:bg-gray-50 transition-colors text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-[22px]">
          <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl mb-[18px]">
            <div className="w-[54px] h-[54px] rounded-[9px] overflow-hidden bg-gray-100 flex-shrink-0">
              {cover ? (
                <Image src={cover} alt={title} width={54} height={54} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div>
              <strong className="block text-[14px] font-bold text-gray-900">{title}</strong>
              <span className="text-[12.5px] text-gray-400 font-medium">
                {fmtDateRange(booking.start_date, booking.end_date)}
              </span>
            </div>
          </div>

          {/* Stars */}
          <div
            className="flex gap-[6px] justify-center mb-[18px]"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                className="transition-transform hover:scale-110"
              >
                <svg width="32" height="32" viewBox="0 0 24 24"
                  fill={(hover || rating) >= n ? "#f5a623" : "#e5e7eb"}
                  stroke={(hover || rating) >= n ? "#f5a623" : "#d1d5db"}
                  strokeWidth="1.2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
          </div>

          <textarea
            className="w-full border border-gray-200 rounded-xl px-[14px] py-[13px] text-[14px] font-medium text-gray-900 placeholder-gray-400 resize-y min-h-[90px] outline-none transition-all focus:border-[#C026D3] focus:ring-2 focus:ring-[#fbe9f8]"
            placeholder="Cuéntanos cómo fue tu experiencia con este equipo y el proveedor…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-[10px] px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={isPending}
            className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-900 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => rating && onSubmit(rating, text)}
            disabled={!rating || isPending}
            className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
          >
            {isPending ? "Publicando…" : "Publicar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-[9px] bg-[#16131c] text-white text-[14px] font-semibold px-[22px] py-[13px] rounded-full shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] animate-in slide-in-from-bottom-2 fade-in duration-200">
      <Check size={18} className="text-[#5fd29a]" strokeWidth={2.4} />
      {msg}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div
        className="w-[104px] h-[104px] rounded-full flex items-center justify-center mb-[22px] text-[#C026D3]"
        style={{ background: "#fbe9f8" }}
      >
        <Calendar size={48} strokeWidth={1.5} />
      </div>
      <h2 className="text-[21px] font-extrabold tracking-tight text-gray-900">
        No tienes reservas {label.toLowerCase()}
      </h2>
      <p className="text-[14.5px] text-gray-400 font-medium mt-[9px] max-w-[380px] leading-[1.55]">
        Cuando reserves un equipo aparecerá aquí con su estado y opciones de gestión.
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center gap-[7px] mt-[22px] text-white font-bold text-[14.5px] px-6 py-[13px] rounded-xl shadow-[0_10px_24px_-8px_rgba(192,38,211,.6)] hover:brightness-105 active:scale-[.97] transition-all"
        style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
      >
        Explorar equipos
        <ChevronRight size={17} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  providerName,
  onCancel,
  onReview,
}: {
  booking: BookingWithDetails;
  providerName: string;
  onCancel: (b: BookingWithDetails) => void;
  onReview: (b: BookingWithDetails) => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const unit = booking.booking_units[0];
  const cover = unit?.listing?.image_urls?.[0] ?? null;
  const title = unit?.listing?.title ?? "Equipo alquilado";
  const location = unit?.listing?.location ?? null;
  const category = unit?.listing?.category ?? null;
  const days = countDays(booking.start_date, booking.end_date);
  const { tab } = STATUS_CONFIG[booking.status];
  const canCancel = booking.status === "AWAITING_SIGNATURES";
  const canReview = booking.status === "COMPLETED" && !booking.client_has_reviewed;

  return (
    <article className="flex items-stretch gap-5 p-4 border border-[#e1dde7] rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,19,28,.04)] transition-all duration-200 hover:shadow-[0_14px_34px_-16px_rgba(22,19,28,.30),0_2px_6px_rgba(22,19,28,.05)] hover:-translate-y-0.5 hover:border-[#eceaef]">

      {/* Thumbnail */}
      <div className="relative w-[184px] flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4] min-h-[148px] self-stretch">
        {cover && imgOk ? (
          <Image
            src={cover}
            alt={title}
            fill
            className="object-cover"
            sizes="184px"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">📦</div>
        )}
        {category && (
          <span className="absolute left-[9px] top-[9px] px-[9px] py-[5px] rounded-full bg-white/94 backdrop-blur-sm text-[10.5px] font-extrabold tracking-wide uppercase text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,.1)]">
            {CAT_LABELS[category] ?? category}
          </span>
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 flex flex-col gap-[9px] py-[3px]">
        <StatusBadge status={booking.status} />

        <h3 className="text-[17.5px] font-extrabold tracking-tight text-gray-900 leading-snug">
          {title}
        </h3>

        {/* Provider + location */}
        <div className="flex items-center gap-[9px] text-[13.5px] text-gray-600 font-semibold flex-wrap">
          <span className="w-6 h-6 rounded-full bg-[#fbe9f8] text-[#86198f] text-[11px] font-extrabold grid place-items-center flex-shrink-0">
            {initials(providerName)}
          </span>
          <span className="truncate max-w-[200px]">{providerName}</span>
          {location && (
            <>
              <span className="text-gray-200">·</span>
              <span className="flex items-center gap-1 text-gray-400 font-medium">
                <MapPin size={13} strokeWidth={1.8} />
                {location}
              </span>
            </>
          )}
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-[13.5px] text-gray-600 font-semibold">
          <Calendar size={16} strokeWidth={1.8} className="text-gray-400 flex-shrink-0" />
          {fmtDateRange(booking.start_date, booking.end_date)}
          <span className="text-gray-400 font-medium">
            · {days} {days === 1 ? "día" : "días"}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 flex flex-col items-end justify-between text-right gap-[14px] py-[3px] min-w-[170px] border-l border-[#eceaef] pl-[22px]">
        {/* Price */}
        <div>
          <div className="text-[23px] font-extrabold tracking-tight text-gray-900">
            {peso(booking.total_price)}
          </div>
          <div className="text-[12px] text-gray-400 font-medium mt-[3px]">
            {unit?.locked_daily_price
              ? `${peso(unit.locked_daily_price)} × ${days} ${days === 1 ? "día" : "días"}`
              : `${days} ${days === 1 ? "día" : "días"}`}
          </div>
          <div className="text-[12px] text-gray-400 font-medium mt-[6px]">
            Solicitado el {fmtDate(booking.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-stretch gap-2 w-full">
          {canReview && (
            <button
              onClick={() => onReview(booking)}
              className="flex items-center justify-center gap-[6px] text-[13.5px] font-bold px-4 py-[10px] rounded-[11px] text-white transition-all hover:brightness-105 active:scale-[.97]"
              style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
            >
              <Star size={14} />
              Dejar reseña
            </button>
          )}
          {booking.status === "COMPLETED" && booking.client_has_reviewed && (
            <span className="flex items-center justify-center gap-[6px] text-[12px] font-bold px-4 py-[10px] rounded-[11px] bg-[#e6f6ed] text-[#157a45]">
              <Check size={13} strokeWidth={2.5} />
              Reseña enviada
            </span>
          )}
          <Link
            href={`/listings/${unit?.listing_id ?? ""}`}
            className="flex items-center justify-center gap-[6px] text-[13.5px] font-bold px-4 py-[10px] rounded-[11px] border border-[#e1dde7] text-gray-900 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors active:scale-[.97]"
          >
            Ver detalles
          </Link>
          {canCancel && (
            <button
              onClick={() => onCancel(booking)}
              className="flex items-center justify-center text-[13.5px] font-bold px-4 py-[10px] rounded-[11px] border border-[#f3c9d0] text-[#bd2c45] bg-white hover:bg-[#fdeaec] hover:border-[#e89aa6] transition-colors active:scale-[.97]"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

interface Props {
  bookings: BookingWithDetails[];
  providerNames: Record<string, string>;
}

export default function ReservasClient({ bookings: initialBookings, providerNames }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [tab, setTab] = useState<TabId>("todas");
  const [cancelTarget, setCancelTarget] = useState<BookingWithDetails | null>(null);
  const [reviewTarget, setReviewTarget] = useState<BookingWithDetails | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Tab counts
  const counts = TABS.reduce<Record<TabId, number>>((acc, t) => {
    acc[t.id] = t.id === "todas"
      ? bookings.length
      : bookings.filter(b => STATUS_CONFIG[b.status].tab === t.id).length;
    return acc;
  }, { todas: 0, activas: 0, completadas: 0, canceladas: 0 });

  const list = tab === "todas"
    ? bookings
    : bookings.filter(b => STATUS_CONFIG[b.status].tab === tab);

  // Cancel handler
  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    startTransition(async () => {
      const result = await cancelBooking(id);
      if (result.success) {
        setBookings(prev => prev.map(b =>
          b.id === id ? { ...b, status: "CANCELLED" as BookingStatus } : b
        ));
        flash("Reserva cancelada");
      } else {
        flash(result.error ?? "No se pudo cancelar la reserva");
      }
      setCancelTarget(null);
    });
  };

  // Review handler
  const handleSubmitReview = (rating: number, text: string) => {
    if (!reviewTarget) return;
    const id = reviewTarget.id;
    startTransition(async () => {
      const result = await createClientReview(id, { rating, content: text });
      if (result.success) {
        setBookings(prev => prev.map(b =>
          b.id === id ? { ...b, client_has_reviewed: true } : b
        ));
        flash(`¡Gracias! Publicaste ${rating} ${rating === 1 ? "estrella" : "estrellas"}`);
      } else {
        flash(result.error ?? "No se pudo enviar la reseña");
      }
      setReviewTarget(null);
    });
  };

  return (
    <main className="flex-1">
      <div className="max-w-[940px] mx-auto px-8 pt-10 pb-20 min-h-[64vh]">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-gray-900">
            Mis Reservas
          </h1>
          <p className="text-[15px] text-gray-400 font-medium mt-2">
            Consulta y gestiona los equipos que has alquilado en ArtRider.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100 mb-7 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-2 text-[15px] font-bold pb-[15px] mr-7 whitespace-nowrap transition-colors ${active ? "text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
              >
                {t.label}
                <span
                  className="text-[12px] font-bold min-w-[22px] h-[22px] rounded-full grid place-items-center px-[7px] transition-colors"
                  style={{
                    background: active ? "#fbe9f8" : "#f2f1f5",
                    color: active ? "#86198f" : "#46414f",
                  }}
                >
                  {counts[t.id]}
                </span>
                {active && (
                  <span
                    className="absolute left-0 right-0 bottom-[-1px] h-[2.5px] rounded-sm"
                    style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* List or empty */}
        {list.length === 0 ? (
          <EmptyState label={TABS.find(t => t.id === tab)!.label} />
        ) : (
          <div className="flex flex-col gap-4">
            {list.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                providerName={providerNames[b.provider_id] ?? "Proveedor ArtRider"}
                onCancel={setCancelTarget}
                onReview={setReviewTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          providerName={providerNames[cancelTarget.provider_id] ?? "Proveedor ArtRider"}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleConfirmCancel}
          isPending={isPending}
        />
      )}
      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleSubmitReview}
          isPending={isPending}
        />
      )}
      {toast && <Toast msg={toast} />}
    </main>
  );
}
