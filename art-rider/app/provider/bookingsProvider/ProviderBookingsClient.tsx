"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar, Check, X, Archive, Send,
  Wallet, Star, Inbox, ShieldCheck,
} from "lucide-react";
import type { BookingWithDetails, BookingStatus } from "@/services/bookingsService";
import { updateBookingStatus, archiveBookingWithReview } from "@/services/bookingsService";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"] as const;

const CAT_LABELS: Record<string, string> = {
  audio: "Sonido", lighting: "Iluminación", video: "Video",
  effects: "Efectos", advertising: "Publicidad", other: "Otro",
};

type Tone   = "ok" | "warn" | "danger" | "muted";
type TimeId = "hoy" | "semana" | "mes" | "todas";

interface StatusCfg { label: string; tone: Tone; filter: string }

const STATUS_CFG: Partial<Record<BookingStatus, StatusCfg>> = {
  AWAITING_SIGNATURES: { label: "Pendiente",  tone: "warn",   filter: "pendientes"  },
  PAID:                { label: "Aprobado",   tone: "ok",     filter: "aprobadas"   },
  ACTIVE:              { label: "Aprobado",   tone: "ok",     filter: "aprobadas"   },
  COMPLETED:           { label: "Completado", tone: "muted",  filter: "completadas" },
  DISPUTE:             { label: "Rechazado",  tone: "danger", filter: "rechazadas"  },
  CANCELLED:           { label: "Rechazado",  tone: "danger", filter: "rechazadas"  },
};

const TONE_STYLES: Record<Tone, string> = {
  ok:     "bg-[#e6f6ed] text-[#157a45]",
  warn:   "bg-[#fdf2df] text-[#a06a0c]",
  danger: "bg-[#fdeaec] text-[#bd2c45]",
  muted:  "bg-[#edebf0] text-[#5b5567]",
};

const TIME_TABS: { id: TimeId; label: string }[] = [
  { id: "hoy",    label: "Hoy"    },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes"    },
  { id: "todas",  label: "Todas"  },
];

const FILTER_PILLS = [
  { id: "todas",       label: "Todas",       dot: null       },
  { id: "pendientes",  label: "Pendientes",  dot: "warn"     },
  { id: "aprobadas",   label: "Aprobadas",   dot: "ok"       },
  { id: "rechazadas",  label: "Rechazadas",  dot: "danger"   },
  { id: "completadas", label: "Completadas", dot: "muted"    },
];

const DOT_COLORS: Record<string, string> = {
  warn: "bg-[#e9a417]", ok: "bg-[#1f9d5b]", danger: "bg-[#e0455f]", muted: "bg-[#9b95a6]",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

function fmtRange(start: string, end: string) {
  const s = new Date(start); const e = new Date(end);
  if (start === end) return fmtDate(start);
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear())
    return `${s.getUTCDate()} – ${e.getUTCDate()} ${MONTHS_SHORT[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function countDays(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000) + 1);
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function peso(cents: number) {
  const d = cents / 100;
  return "$" + (Number.isInteger(d) ? d : d.toFixed(2));
}

function getTimePeriod(startDate: string): TimeId {
  const now = new Date();
  const s   = new Date(startDate);
  const todayStr = now.toISOString().slice(0, 10);
  const startStr = s.toISOString().slice(0, 10);
  if (startStr === todayStr) return "hoy";
  const day = now.getDay() || 7;
  const monday = new Date(now); monday.setDate(now.getDate() - (day - 1)); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  if (s >= monday && s <= sunday) return "semana";
  if (s.getFullYear() === now.getFullYear() && s.getMonth() === now.getMonth()) return "mes";
  return "mes";
}

// ── Client avatar color (deterministic from name) ─────────────────────────────

const AVATAR_COLORS = ["#7C3AED","#D61F9E","#2563eb","#0891b2","#059669","#ea580c","#9333ea"];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span className={`self-start inline-flex items-center gap-[7px] text-[11px] font-extrabold tracking-wide uppercase px-[11px] py-[5px] rounded-full ${TONE_STYLES[cfg.tone]}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  booking, onClose, onConfirm, isPending,
}: {
  booking: BookingWithDetails;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const unit  = booking.booking_units[0];
  const cover = unit?.listing?.image_urls?.[0] ?? null;
  const title = unit?.listing?.title ?? "Equipo";
  const clientName = booking.client_profile?.full_name ?? "Cliente";

  return (
    <div className="fixed inset-0 bg-[rgba(22,19,28,.5)] backdrop-blur-[2px] z-[90] grid place-items-center p-6 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-white rounded-[20px] shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-gray-100">
          <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">Rechazar solicitud</h3>
          <button onClick={onClose} className="w-[38px] h-[38px] rounded-full grid place-items-center hover:bg-gray-50 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-[22px] py-5">
          <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl mb-4">
            <div className="w-[52px] h-[52px] rounded-[9px] overflow-hidden bg-gray-100 flex-shrink-0">
              {cover ? <Image src={cover} alt={title} width={52} height={52} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
            </div>
            <div><strong className="block text-[14px] font-bold text-gray-900">{title}</strong><span className="text-[12.5px] text-gray-400 font-medium">{clientName} · {fmtRange(booking.start_date, booking.end_date)}</span></div>
          </div>
          <p className="text-[14px] text-gray-600 font-medium leading-[1.55]">Cuéntale a <strong className="text-gray-900">{clientName}</strong> por qué no puedes aceptar esta reserva. Tu mensaje le ayuda a buscar otra opción a tiempo.</p>
          <textarea
            className="w-full mt-[14px] border border-gray-200 rounded-xl px-[14px] py-3 text-[14px] font-medium text-gray-900 placeholder-gray-400 resize-y min-h-[84px] outline-none focus:border-[#C026D3] focus:ring-2 focus:ring-[#fbe9f8] transition-all"
            placeholder="Ej. El equipo ya está reservado para esas fechas…"
            value={reason} onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-[10px] px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-900 transition-colors disabled:opacity-50">Volver</button>
          <button onClick={() => onConfirm(reason)} disabled={isPending} className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-[#f3c9d0] text-[#bd2c45] hover:bg-[#fdeaec] hover:border-[#e89aa6] transition-colors disabled:opacity-50">
            {isPending ? "Rechazando…" : "Rechazar reserva"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Archive + review modal ────────────────────────────────────────────────────

function ArchiveModal({
  booking, onClose, onConfirm, isPending,
}: {
  booking: BookingWithDetails;
  onClose: () => void;
  onConfirm: (rating: number, content: string) => void;
  isPending: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [hover,  setHover]  = useState(0);
  const [text,   setText]   = useState("");
  const unit  = booking.booking_units[0];
  const cover = unit?.listing?.image_urls?.[0] ?? null;
  const title = unit?.listing?.title ?? "Equipo";
  const clientName = booking.client_profile?.full_name ?? "Cliente";

  return (
    <div className="fixed inset-0 bg-[rgba(22,19,28,.5)] backdrop-blur-[2px] z-[90] grid place-items-center p-6 animate-in fade-in duration-150" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-white rounded-[20px] shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-[18px] border-b border-gray-100">
          <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">Archivar reserva</h3>
          <button onClick={onClose} className="w-[38px] h-[38px] rounded-full grid place-items-center hover:bg-gray-50 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-[22px] py-5">
          <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl mb-4">
            <div className="w-[52px] h-[52px] rounded-[9px] overflow-hidden bg-gray-100 flex-shrink-0">
              {cover ? <Image src={cover} alt={title} width={52} height={52} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
            </div>
            <div><strong className="block text-[14px] font-bold text-gray-900">{title}</strong><span className="text-[12.5px] text-gray-400 font-medium">{clientName} · {fmtRange(booking.start_date, booking.end_date)}</span></div>
          </div>
          <p className="text-[14px] text-gray-600 font-medium leading-[1.55] mb-3">Califica tu experiencia con <strong className="text-gray-900">{clientName}</strong> antes de archivar la reserva.</p>
          <div className="flex gap-[6px] justify-center mb-4" onMouseLeave={() => setHover(0)}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                <svg width="28" height="28" viewBox="0 0 24 24" fill={(hover||rating)>=n?"#f5a623":"#e5e7eb"} stroke={(hover||rating)>=n?"#f5a623":"#d1d5db"} strokeWidth="1.2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
            ))}
          </div>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-[14px] py-3 text-[14px] font-medium text-gray-900 placeholder-gray-400 resize-y min-h-[84px] outline-none focus:border-[#C026D3] focus:ring-2 focus:ring-[#fbe9f8] transition-all"
            placeholder="Cuéntanos sobre la experiencia con este cliente…"
            value={text} onChange={e => setText(e.target.value)}
          />
        </div>
        <div className="flex gap-[10px] px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] border border-gray-200 text-gray-900 hover:bg-gray-50 hover:border-gray-900 transition-colors disabled:opacity-50">Cancelar</button>
          <button
            onClick={() => rating && onConfirm(rating, text)}
            disabled={!rating || isPending}
            className="flex-1 py-[13px] text-[14.5px] font-bold rounded-[11px] text-white transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
          >
            {isPending ? "Archivando…" : "Enviar y archivar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, danger }: { msg: string; danger?: boolean }) {
  return (
    <div className={`fixed bottom-7 z-[95] flex items-center gap-[9px] text-white text-[14px] font-semibold px-[22px] py-[13px] rounded-full shadow-[0_12px_34px_-10px_rgba(22,19,28,.22)] animate-in slide-in-from-bottom-2 fade-in duration-200 bg-[#16131c]`}
      style={{ left: "calc(50% + 128px)", transform: "translateX(-50%)" }}>
      {danger
        ? <X size={17} strokeWidth={2.4} className="text-[#ff8ba0]" />
        : <Check size={18} strokeWidth={2.4} className="text-[#5fd29a]" />}
      {msg}
    </div>
  );
}

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onReject,
  onArchive,
  onApprove,
  onMsg,
}: {
  booking: BookingWithDetails;
  onReject: (b: BookingWithDetails) => void;
  onArchive: (b: BookingWithDetails) => void;
  onApprove: (b: BookingWithDetails) => void;
  onMsg: (b: BookingWithDetails) => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const unit     = booking.booking_units[0];
  const cover    = unit?.listing?.image_urls?.[0] ?? null;
  const title    = unit?.listing?.title ?? "Equipo alquilado";
  const category = unit?.listing?.category ?? null;
  const days     = countDays(booking.start_date, booking.end_date);
  const payout   = Math.round(booking.total_price * 0.88);
  const clientName = booking.client_profile?.full_name ?? "Cliente";
  const clientId   = booking.client_id;
  const isPending  = booking.status === "AWAITING_SIGNATURES";
  const isApproved = booking.status === "PAID" || booking.status === "ACTIVE";
  const isDone     = booking.status === "COMPLETED";

  return (
    <article className={`flex items-stretch gap-[18px] p-[15px] border rounded-2xl bg-white shadow-[0_1px_2px_rgba(22,19,28,.04)] transition-all duration-200 hover:shadow-[0_14px_34px_-16px_rgba(22,19,28,.30)] hover:-translate-y-0.5 ${isPending ? "border-[#f5d9ad]" : "border-[#e1dde7] hover:border-[#eceaef]"}`}>

      {/* Thumbnail */}
      <div className="relative w-[158px] flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4] min-h-[132px] self-stretch">
        {cover && imgOk ? (
          <Image src={cover} alt={title} fill className="object-cover" sizes="158px" onError={() => setImgOk(false)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">📦</div>
        )}
        {category && (
          <span className="absolute left-2 top-2 px-[9px] py-[5px] rounded-full bg-white/94 backdrop-blur-sm text-[10px] font-extrabold tracking-wide uppercase text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,.1)]">
            {CAT_LABELS[category] ?? category}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col gap-[9px] py-[2px]">
        <StatusBadge status={booking.status} />
        <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900 leading-snug">{title}</h3>

        {/* Client */}
        <div className="flex items-center gap-[9px]">
          <span
            className="w-[30px] h-[30px] rounded-full grid place-items-center text-[12px] font-extrabold text-white flex-shrink-0"
            style={{ background: avatarColor(clientId) }}
          >
            {initials(clientName)}
          </span>
          <div>
            <div className="text-[13.5px] font-bold text-gray-900 leading-snug">{clientName}</div>
            <div className="text-[12px] text-gray-400 font-medium flex items-center gap-[5px]">
              <ShieldCheck size={13} className="text-[#1f9d5b]" strokeWidth={2} />
              Identidad verificada
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-2 text-[13px] text-gray-600 font-semibold">
          <Calendar size={15} strokeWidth={1.8} className="text-gray-400 flex-shrink-0" />
          {fmtRange(booking.start_date, booking.end_date)}
          <span className="text-gray-400 font-medium">
            · {days} {days === 1 ? "día" : "días"}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 flex flex-col items-end justify-between text-right gap-[14px] py-[2px] min-w-[172px] border-l border-[#eceaef] pl-5">
        {/* Price */}
        <div>
          <div className="text-[22px] font-extrabold tracking-tight text-gray-900">{peso(booking.total_price)}</div>
          <div className="text-[12px] text-gray-400 font-medium mt-[3px]">
            {unit?.locked_daily_price ? `${peso(unit.locked_daily_price)} × ${days} ${days === 1 ? "día" : "días"}` : `${days} ${days === 1 ? "día" : "días"}`}
          </div>
          {(isApproved || isDone) && (
            <div className="text-[12px] text-[#157a45] font-bold mt-[6px] flex items-center gap-1 justify-end">
              <Wallet size={13} strokeWidth={1.9} />
              Recibes {peso(payout)}
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 w-full">
            <button
              onClick={() => onApprove(booking)}
              className="flex-1 flex items-center justify-center gap-[6px] text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] text-white hover:brightness-105 active:scale-[.97] transition-all shadow-[0_8px_18px_-8px_rgba(192,38,211,.55)]"
              style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
            >
              <Check size={15} strokeWidth={2.4} />
              Aprobar
            </button>
            <button
              onClick={() => onReject(booking)}
              className="flex-1 flex items-center justify-center text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] border border-[#f3c9d0] text-[#bd2c45] bg-white hover:bg-[#fdeaec] hover:border-[#e89aa6] transition-colors active:scale-[.97]"
            >
              Rechazar
            </button>
          </div>
        )}
        {isApproved && (
          <div className="flex gap-2 w-full">
            <Link
              href={`/listings/${unit?.listing_id ?? ""}`}
              className="flex-1 flex items-center justify-center text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] border border-[#e1dde7] text-gray-900 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors"
            >
              Ver detalles
            </Link>
            <Link
              href={`/provider/mensajes`}
              className="flex-1 flex items-center justify-center gap-[6px] text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] text-white hover:brightness-105 active:scale-[.97] transition-all"
              style={{ background: "linear-gradient(100deg,#7C3AED 0%,#D61F9E 100%)" }}
            >
              <Send size={14} />
              Mensaje
            </Link>
          </div>
        )}
        {isDone && (
          <div className="w-full">
            <button
              onClick={() => onArchive(booking)}
              className="w-full flex items-center justify-center gap-[6px] text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] bg-[#f2f1f5] text-gray-700 hover:bg-[#e1dde7] hover:text-gray-900 transition-colors active:scale-[.97]"
            >
              <Archive size={15} strokeWidth={1.9} />
              Archivar
            </button>
          </div>
        )}
        {(booking.status === "CANCELLED" || booking.status === "DISPUTE") && (
          <div className="w-full">
            <Link
              href={`/listings/${unit?.listing_id ?? ""}`}
              className="w-full flex items-center justify-center text-[13.5px] font-bold py-[10px] px-3 rounded-[11px] border border-[#e1dde7] text-gray-900 bg-white hover:border-gray-900 hover:bg-gray-50 transition-colors"
            >
              Ver detalles
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, iconClass = "" }: {
  label: string; value: string; sub?: string; icon: React.ElementType; iconClass?: string;
}) {
  return (
    <div className="border border-[#e1dde7] rounded-[14px] px-[18px] py-4 bg-white shadow-[0_1px_2px_rgba(22,19,28,.04)]">
      <div className="flex items-center gap-[7px] text-[12.5px] font-semibold text-gray-400">
        <Icon size={15} className={iconClass || "text-[#C026D3]"} strokeWidth={1.9} />
        {label}
      </div>
      <div className="text-[24px] font-extrabold tracking-tight text-gray-900 mt-[9px]">
        {value}
        {sub && <small className="text-[13px] font-semibold text-gray-400 ml-[3px]">{sub}</small>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  bookings: BookingWithDetails[];
  avgRating: number;
  reviewCount: number;
}

export default function ProviderBookingsClient({ bookings: initial, avgRating, reviewCount }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial);
  const [time,   setTime]   = useState<TimeId>("todas");
  const [filter, setFilter] = useState("todas");
  const [rejectTarget,  setRejectTarget]  = useState<BookingWithDetails | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BookingWithDetails | null>(null);
  const [toast,  setToast]  = useState<{ msg: string; danger?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const flash = (msg: string, danger?: boolean) => {
    setToast({ msg, danger });
    setTimeout(() => setToast(null), 2700);
  };

  // KPI values (from all bookings, not filtered)
  const pendingCount  = bookings.filter(b => b.status === "AWAITING_SIGNATURES").length;
  const approvedCount = bookings.filter(b => b.status === "PAID" || b.status === "ACTIVE").length;
  const now = new Date();
  const monthlyIncome = bookings
    .filter(b => {
      const s = new Date(b.start_date);
      return (b.status === "PAID" || b.status === "ACTIVE" || b.status === "COMPLETED") &&
        s.getFullYear() === now.getFullYear() && s.getMonth() === now.getMonth();
    })
    .reduce((sum, b) => sum + Math.round(b.total_price * 0.88), 0);

  // Time filter
  const byTime = time === "todas" ? bookings : bookings.filter(b => getTimePeriod(b.start_date) === time);

  // Status filter counts
  const counts = FILTER_PILLS.reduce<Record<string, number>>((acc, f) => {
    const cfg = STATUS_CFG;
    acc[f.id] = f.id === "todas"
      ? byTime.length
      : byTime.filter(b => {
          const c = cfg[b.status];
          return c?.filter === f.id;
        }).length;
    return acc;
  }, {});

  const list = filter === "todas"
    ? byTime
    : byTime.filter(b => STATUS_CFG[b.status]?.filter === filter);

  // Approve
  const handleApprove = (b: BookingWithDetails) => {
    startTransition(async () => {
      const res = await updateBookingStatus(b.id, "PAID");
      if (res?.error) { flash(res.error, true); return; }
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: "PAID" as BookingStatus } : x));
      flash("Reserva aprobada · cliente notificado");
    });
  };

  // Reject
  const handleConfirmReject = (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    startTransition(async () => {
      const res = await updateBookingStatus(id, "CANCELLED");
      setRejectTarget(null);
      if (res?.error) { flash(res.error, true); return; }
      setBookings(prev => prev.map(x => x.id === id ? { ...x, status: "CANCELLED" as BookingStatus } : x));
      flash("Solicitud rechazada", true);
    });
  };

  // Archive
  const handleConfirmArchive = (rating: number, content: string) => {
    if (!archiveTarget) return;
    const id = archiveTarget.id;
    startTransition(async () => {
      const res = await archiveBookingWithReview(id, { rating, content });
      setArchiveTarget(null);
      if (!res.success) { flash(res.error ?? "No se pudo archivar", true); return; }
      setBookings(prev => prev.filter(x => x.id !== id));
      flash("Reserva archivada · reseña enviada");
    });
  };

  return (
    <div className="max-w-[1080px]">
      {/* Title row */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-gray-900">Reservas</h1>
          <p className="text-[14.5px] text-gray-400 font-medium mt-[7px]">Gestiona las solicitudes de alquiler de tus equipos.</p>
        </div>
        {/* Time tabs */}
        <div className="inline-flex bg-[#f2f1f5] rounded-xl p-1 gap-[2px] flex-shrink-0">
          {TIME_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTime(t.id)}
              className={`text-[13.5px] font-bold px-4 py-2 rounded-[9px] transition-all ${time === t.id ? "bg-white text-gray-900 shadow-[0_1px_2px_rgba(22,19,28,.04)]" : "text-gray-400 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-1">
        <KpiCard label="Pendientes"     value={String(pendingCount)}  sub="por revisar" icon={Calendar} />
        <KpiCard label="Aprobadas"      value={String(approvedCount)} sub="activas"     icon={Check} />
        <KpiCard label="Ingresos del mes" value={peso(monthlyIncome)}                   icon={Wallet} />
        <KpiCard
          label="Valoración"
          value={reviewCount > 0 ? avgRating.toFixed(2) : "—"}
          sub={reviewCount > 0 ? "/ 5" : undefined}
          icon={Star}
          iconClass="text-[#C026D3]"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-[9px] my-[26px] flex-wrap">
        {FILTER_PILLS.map(f => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-2 text-[13.5px] font-bold px-[15px] py-[9px] rounded-full border transition-all ${on ? "bg-[#16131c] text-white border-[#16131c]" : "text-[#46414f] border-[#e1dde7] bg-white hover:border-gray-900"}`}
            >
              {f.dot && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLORS[f.dot]}`} />}
              {f.label}
              <span className={`text-[11.5px] font-extrabold ${on ? "text-white/70" : "text-gray-400"}`}>
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List or empty */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center text-center py-14">
          <div className="w-24 h-24 rounded-full bg-[#fbe9f8] text-[#C026D3] grid place-items-center mb-5">
            <Inbox size={44} strokeWidth={1.5} />
          </div>
          <h2 className="text-[19px] font-extrabold tracking-tight text-gray-900">Sin reservas en esta vista</h2>
          <p className="text-[14px] text-gray-400 font-medium mt-2 max-w-[340px] leading-[1.55]">
            Prueba con otro periodo o filtro. Las nuevas solicitudes aparecerán aquí en cuanto un cliente reserve tu equipo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {list.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onApprove={handleApprove}
              onReject={setRejectTarget}
              onArchive={setArchiveTarget}
              onMsg={() => {}}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {rejectTarget && (
        <RejectModal
          booking={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleConfirmReject}
          isPending={isPending}
        />
      )}
      {archiveTarget && (
        <ArchiveModal
          booking={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onConfirm={handleConfirmArchive}
          isPending={isPending}
        />
      )}
      {toast && <Toast msg={toast.msg} danger={toast.danger} />}
    </div>
  );
}
