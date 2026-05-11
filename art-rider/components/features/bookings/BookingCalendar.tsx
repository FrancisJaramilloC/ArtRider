"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { DayPicker, type DayButton } from "react-day-picker";
import { es } from "date-fns/locale";
import {
  format,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  isToday,
} from "date-fns";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────

type BookingStatus =
  | "AWAITING_SIGNATURES"
  | "PAID"
  | "ACTIVE"
  | "COMPLETED"
  | "DISPUTE"
  | "CANCELLED";

interface BookingWithUnits {
  id: string;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  total_price: number;
  booking_units: {
    id: string;
    locked_daily_price: number;
    equipment_units: {
      id: string;
      listings: {
        title: string;
        brand: string;
        model: string;
        cover_image_url: string | null;
        category: string;
      } | null;
    } | null;
  }[];
}

// ─── Status config ────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; dotClass: string; badgeClass: string; Icon: React.ElementType }
> = {
  AWAITING_SIGNATURES: {
    label: "Esperando firmas",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  PAID: {
    label: "Pagado",
    dotClass: "bg-blue-400",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: CheckCircle2,
  },
  ACTIVE: {
    label: "Activo",
    dotClass: "bg-emerald-400",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  COMPLETED: {
    label: "Completado",
    dotClass: "bg-purple-400",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    Icon: CheckCircle2,
  },
  DISPUTE: {
    label: "En disputa",
    dotClass: "bg-red-400",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    Icon: AlertTriangle,
  },
  CANCELLED: {
    label: "Cancelado",
    dotClass: "bg-gray-300",
    badgeClass: "bg-gray-50 text-gray-500 border-gray-200",
    Icon: XCircle,
  },
};

const STATS_CONFIG = [
  {
    key: "total" as const,
    label: "Total",
    color: "text-gray-900",
    filter: (b: BookingWithUnits[]) => b.length,
  },
  {
    key: "active" as const,
    label: "En curso",
    color: "text-emerald-700",
    filter: (b: BookingWithUnits[]) =>
      b.filter((x) => x.status === "ACTIVE" || x.status === "PAID").length,
  },
  {
    key: "completed" as const,
    label: "Completadas",
    color: "text-[#875B9A]",
    filter: (b: BookingWithUnits[]) =>
      b.filter((x) => x.status === "COMPLETED").length,
  },
  {
    key: "pending" as const,
    label: "Por firmar",
    color: "text-amber-700",
    filter: (b: BookingWithUnits[]) =>
      b.filter((x) => x.status === "AWAITING_SIGNATURES").length,
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDateRange(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end);
  const sameMonth = format(s, "yyyy-MM") === format(e, "yyyy-MM");
  if (sameMonth) {
    return `${format(s, "d", { locale: es })} – ${format(e, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  }
  return `${format(s, "d 'de' MMMM", { locale: es })} – ${format(e, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
}

// ─── Component ────────────────────────────────────────────

interface Props {
  initialUser?: User | null;
}

export default function BookingCalendar({ initialUser }: Props) {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [bookings, setBookings] = useState<BookingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ─── Auth: subscribe to session changes ───────────────
  useEffect(() => {
    if (initialUser) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, [supabase, initialUser]);

  // ─── Fetch bookings ───────────────────────────────────
  // Explicit eq("client_id", user.id) per RLS rule — never rely solely on RLS.
  const loadBookings = useCallback(
    async (uid: string) => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `id, status, start_date, end_date, total_price,
           booking_units (
             id, locked_daily_price,
             equipment_units (
               id,
               listings ( title, brand, model, cover_image_url, category )
             )
           )`
        )
        .eq("client_id", uid)
        .order("start_date", { ascending: false });

      if (error) {
        setError("No se pudieron cargar las reservas. Inténtalo de nuevo.");
      } else {
        setBookings((data as unknown as BookingWithUnits[]) ?? []);
      }
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadBookings(user.id);
  }, [user, loadBookings]);

  // ─── Derived state ────────────────────────────────────

  const bookingsByDate = useMemo<Record<string, BookingWithUnits[]>>(() => {
    const map: Record<string, BookingWithUnits[]> = {};
    for (const booking of bookings) {
      try {
        const days = eachDayOfInterval({
          start: parseISO(booking.start_date),
          end: parseISO(booking.end_date),
        });
        for (const day of days) {
          const key = format(day, "yyyy-MM-dd");
          (map[key] ??= []).push(booking);
        }
      } catch {
        // skip bookings with malformed dates
      }
    }
    return map;
  }, [bookings]);

  const selectedDayBookings = useMemo<BookingWithUnits[]>(() => {
    if (!selectedDay) return [];
    return bookingsByDate[format(selectedDay, "yyyy-MM-dd")] ?? [];
  }, [selectedDay, bookingsByDate]);

  const upcomingBookings = useMemo<BookingWithUnits[]>(() => {
    const now = new Date();
    return bookings
      .filter((b) => b.status !== "CANCELLED")
      .filter((b) => parseISO(b.end_date) >= now)
      .sort(
        (a, b) =>
          parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
      )
      .slice(0, 5);
  }, [bookings]);

  // ─── Calendar components ──────────────────────────────

  const calendarComponents = useMemo(
    () => ({
      Chevron: ({ orientation }: { orientation?: string }) =>
        orientation === "left" ? (
          <ChevronLeft className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        ),

      DayButton: ({
        day,
        modifiers,
        ...props
      }: React.ComponentProps<typeof DayButton>) => {
        const dateKey = format(day.date, "yyyy-MM-dd");
        const dayBookings = bookingsByDate[dateKey] ?? [];
        const isSelected = selectedDay ? isSameDay(day.date, selectedDay) : false;
        const isDayToday = isToday(day.date);

        return (
          <button
            {...props}
            onClick={() => setSelectedDay(isSelected ? undefined : day.date)}
            className={cn(
              "relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-sm",
              "transition-all duration-150 ease-in-out select-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A]/60",
              isDayToday && !isSelected && "font-bold ring-2 ring-inset ring-[#875B9A]/50",
              isSelected && "bg-[#875B9A] text-white shadow-md hover:bg-[#6a437a]",
              !isSelected && "text-gray-700 hover:bg-gray-50",
              modifiers.outside && "text-gray-300 hover:bg-transparent",
              modifiers.disabled && "pointer-events-none opacity-40"
            )}
          >
            <span>{day.date.getDate()}</span>
            {dayBookings.length > 0 && (
              <span className="flex gap-0.5">
                {dayBookings.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className={cn(
                      "inline-block size-1.5 rounded-full transition-opacity duration-150",
                      isSelected ? "bg-white/70" : STATUS_CONFIG[b.status].dotClass
                    )}
                  />
                ))}
              </span>
            )}
          </button>
        );
      },
    }),
    [bookingsByDate, selectedDay]
  );

  // ─── Loading / error guards ───────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-[#875B9A]" />
          <p className="text-xs text-gray-400">Cargando reservas…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          {user && (
            <button
              onClick={() => loadBookings(user.id)}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white transition-all duration-150 hover:bg-red-700"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-1">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-gray-900">
          Reservas
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Equipos de audio que has alquilado en ArtRider — Loja.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS_CONFIG.map(({ label, color, filter }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              {label}
            </p>
            <p className={cn("mt-2 text-3xl font-bold leading-none", color)}>
              {filter(bookings)}
            </p>
          </div>
        ))}
      </div>

      {/* Main: calendar + detail panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">

        {/* Calendar */}
        <div className="self-start rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={es}
            showOutsideDays
            classNames={{
              root: "w-full min-w-[288px]",
              months: "w-full",
              month: "w-full",
              nav: "mb-5 flex items-center justify-between",
              button_previous: cn(
                "flex size-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400",
                "transition-all duration-150 ease-in-out hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              ),
              button_next: cn(
                "flex size-8 items-center justify-center rounded-xl border border-gray-200 text-gray-400",
                "transition-all duration-150 ease-in-out hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              ),
              month_caption: "text-sm font-semibold capitalize text-gray-900",
              table: "w-full border-collapse",
              weekdays: "flex",
              weekday:
                "flex-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400",
              week: "flex",
              day: "flex-1 p-1",
              today: "",
              outside: "",
              disabled: "",
              hidden: "invisible",
            }}
            components={calendarComponents}
          />

          {/* Legend */}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-gray-100 pt-5">
            {(
              [
                "ACTIVE",
                "AWAITING_SIGNATURES",
                "DISPUTE",
                "COMPLETED",
              ] as BookingStatus[]
            ).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn("size-2 rounded-full", STATUS_CONFIG[s].dotClass)}
                />
                <span className="text-[11px] text-gray-500">
                  {STATUS_CONFIG[s].label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel — fixed min-height prevents layout shift on day change */}
        <div className="min-h-[480px] space-y-4">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-base font-semibold capitalize text-gray-900">
                  {format(selectedDay, "EEEE, d 'de' MMMM", { locale: es })}
                </h2>
                <button
                  onClick={() => setSelectedDay(undefined)}
                  className="text-xs text-gray-400 underline underline-offset-2 transition-colors duration-150 hover:text-gray-600"
                >
                  Ver próximas
                </button>
              </div>
              {selectedDayBookings.length === 0 ? (
                <EmptyState message="Sin reservas para este día" />
              ) : (
                selectedDayBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))
              )}
            </>
          ) : (
            <>
              <h2 className="pb-1 text-base font-semibold text-gray-900">
                Próximas reservas
              </h2>
              {upcomingBookings.length === 0 ? (
                <EmptyState message="No tienes reservas activas próximamente" />
              ) : (
                upcomingBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-center">
      <PackageOpen className="mb-3 size-10 text-gray-300" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingWithUnits }) {
  const { id, status, start_date, end_date, total_price, booking_units } = booking;
  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;
  const listing = booking_units[0]?.equipment_units?.listings ?? null;
  const extraUnits = booking_units.length - 1;

  return (
    <Link
      href={`/dashboard/bookings/${id}`}
      className={cn(
        "group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
        "transition-all duration-150 ease-in-out",
        "hover:-translate-y-px hover:shadow-md hover:border-gray-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A]/60"
      )}
    >
      <div className="flex gap-4">
        {/* Equipment image */}
        <div className="relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {listing?.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.title}
              fill
              sizes="72px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <PackageOpen className="size-7 text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-gray-900 leading-snug">
              {listing?.title ?? "Equipo de audio"}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                config.badgeClass
              )}
            >
              <Icon className="size-3" />
              {config.label}
            </span>
          </div>

          {listing && (
            <p className="mt-0.5 text-xs text-gray-400">
              {listing.brand} · {listing.model}
            </p>
          )}

          {extraUnits > 0 && (
            <p className="mt-0.5 text-[11px] text-gray-400">
              +{extraUnits} equipo{extraUnits > 1 ? "s" : ""} más
            </p>
          )}

          <div className="mt-3 flex items-end justify-between gap-2">
            <p className="text-xs capitalize text-gray-400 leading-snug">
              {formatDateRange(start_date, end_date)}
            </p>
            <p className="shrink-0 text-sm font-bold text-gray-900">
              {formatPrice(total_price)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
