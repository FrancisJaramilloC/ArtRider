"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { getMyProviderProfile } from "@/services/providerService";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";
import { NotificationBell } from "@/components/layout/NotificationBell";

// ─── Nav links (landing only) ─────────────────────────────────────────────────

const LANDING_LINKS = [
  { label: "Categorías", sectionId: "categorias" },
  { label: "Equipos",    sectionId: "equipos"    },
  { label: "Paquetes",   sectionId: "paquetes"   },
];

// ─── Dropdown atoms ───────────────────────────────────────────────────────────

function MenuItem({
  href,
  label,
  bold = false,
  onClick,
  badge,
  danger = false,
}: {
  href?: string;
  label: string;
  bold?: boolean;
  onClick?: () => void;
  badge?: number;
  danger?: boolean;
}) {
  const base =
    `flex items-center justify-between w-full px-4 py-2.5 text-[0.82rem] transition-colors duration-100 cursor-pointer
     ${danger ? "text-red-500 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}
     ${bold ? "font-semibold" : "font-normal"}`;

  const content = (
    <>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#875B9A] text-white text-[10px] font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </>
  );

  if (href) return <Link href={href} className={base} onClick={onClick}>{content}</Link>;
  return <button type="button" className={`${base} text-left`} onClick={onClick}>{content}</button>;
}

function MenuDivider() {
  return <div className="my-1 h-px bg-slate-100" />;
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar({
  initialUser = null,
  hideNavLinks = false,
  logoSubtitle,
}: {
  initialUser?: User | null;
  hideNavLinks?: boolean;
  logoSubtitle?: string;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser]                 = useState<User | null>(initialUser);
  const [isProvider, setIsProvider]     = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(!!initialUser);
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Auth state ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        try { setIsProvider(!!(await getMyProviderProfile())); }
        catch { setIsProvider(false); }
      } else { setIsProvider(false); }
      setLoadingProvider(false);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setIsProvider(false); setLoadingProvider(false); }
      else {
        setLoadingProvider(true);
        getMyProviderProfile()
          .then(p => setIsProvider(!!p))
          .catch(() => setIsProvider(false))
          .finally(() => setLoadingProvider(false));
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, initialUser]);

  // ── Close dropdown on outside click / Escape ─────────────────────────────
  const closeMenu = useCallback(() => setDropdownOpen(false), []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) closeMenu();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, [dropdownOpen, closeMenu]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    closeMenu();
    try { await supabase.auth.signOut(); } catch { /* noop */ }
    window.location.href = "/";
  };

  const userInitial = (
    user?.user_metadata?.display_name?.charAt(0) ||
    user?.user_metadata?.full_name?.charAt(0)    ||
    user?.email?.charAt(0)                        ||
    "U"
  ).toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <nav className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <ArtRiderLogo subtitle={logoSubtitle} />

        {/* ── Center nav (landing only) ─────────────────────────────────────── */}
        {!hideNavLinks && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-7">
            {LANDING_LINKS.map(({ label, sectionId }) => (
              <button
                key={label}
                onClick={() => {
                  const el = document.getElementById(sectionId);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  } else {
                    router.push(`/#${sectionId}`);
                  }
                }}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-2.5 py-1.5 transition-all"
              >
                {label}
              </button>
            ))}
            {user && (
              <Link
                href="/reservas"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-2.5 py-1.5 transition-all"
              >
                Reservas
              </Link>
            )}
          </div>
        )}

        {/* ── Right: actions ───────────────────────────────────────────────── */}
        <div className="ml-auto flex items-center gap-1.5">

          {/* Context CTA */}
          {hideNavLinks ? (
            /* Provider panel → link back to landing */
            <Link
              href="/"
              className="hidden sm:inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 pl-4 pr-3 py-1.5 rounded-lg transition-colors duration-150"
            >
              Inicio
            </Link>
          ) : loadingProvider ? (
            <div className="hidden lg:block w-32 h-7" /> /* placeholder */
          ) : isProvider ? (
            <Link
              href="/provider"
              className="hidden lg:inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Panel de proveedor
            </Link>
          ) : (
            <Link
              href="/become-a-provider"
              className="hidden lg:inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Conviértete en proveedor
            </Link>
          )}

          {/* Notification bell */}
          {user && <NotificationBell />}

          {/* ── Avatar + dropdown ───────────────────────────────────────────── */}
          <div className="relative flex items-center" ref={dropdownRef}>

            {/* Avatar button — opens dropdown */}
            <button
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              onClick={() => setDropdownOpen(o => !o)}
              className={`
                flex items-center gap-2 rounded-full px-2 py-1.5 border transition-all duration-150
                ${dropdownOpen
                  ? "border-slate-300 shadow-sm bg-slate-50"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}
              `}
            >
              {/* Hamburger lines */}
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="#475569" strokeWidth="1.75" strokeLinecap="round">
                <line x1="0" y1="1"  x2="14" y2="1"  />
                <line x1="0" y1="6"  x2="14" y2="6"  />
                <line x1="0" y1="11" x2="14" y2="11" />
              </svg>
              {/* Avatar circle */}
              {user ? (
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold select-none shrink-0">
                  {userInitial}
                </span>
              ) : (
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </span>
              )}
            </button>

            {/* ── Dropdown ──────────────────────────────────────────────────── */}
            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-slate-100 py-1.5 z-[60]"
              >
                {!user ? (
                  /* Guest */
                  <>
                    <MenuItem href="/register" label="Regístrate"      bold onClick={closeMenu} />
                    <MenuItem href="/login"    label="Iniciar sesión"       onClick={closeMenu} />
                    <MenuDivider />
                    <MenuItem href="/become-a-provider" label="Conviértete en proveedor" onClick={closeMenu} />
                    <MenuItem href="/help"               label="Centro de ayuda"          onClick={closeMenu} />
                  </>
                ) : !isProvider ? (
                  /* Client */
                  <>
                    <MenuItem href="/messages"  label="Mensajes"  onClick={closeMenu} />
                    <MenuItem href="/bookings"  label="Reservas"  onClick={closeMenu} />
                    <MenuItem href="/favoritos" label="Favoritos" onClick={closeMenu} />
                    <MenuDivider />
                    <MenuItem href="/become-a-provider" label="Conviértete en proveedor" onClick={closeMenu} />
                    <MenuItem href="/profile"            label="Cuenta"                  onClick={closeMenu} />
                    <MenuDivider />
                    <MenuItem label="Cerrar sesión" danger onClick={handleSignOut} />
                  </>
                ) : (
                  /* Provider */
                  <>
                    <MenuItem href="/messages"  label="Mensajes"  onClick={closeMenu} />
                    <MenuItem href="/bookings"  label="Reservas"  onClick={closeMenu} />
                    <MenuItem href="/favoritos" label="Favoritos" onClick={closeMenu} />
                    <MenuDivider />
                    <MenuItem href="/provider" label="Panel de Proveedor" bold onClick={closeMenu} />
                    <MenuItem href="/profile"  label="Cuenta"                  onClick={closeMenu} />
                    <MenuDivider />
                    <MenuItem label="Cerrar sesión" danger onClick={handleSignOut} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}
