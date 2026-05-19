"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getMyProviderProfile } from "@/services/providerService";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

// Componente para un item del menu
function MenuItem({
  href,
  label,
  bold = false,
  onClick,
  badge,
}: {
  href?: string;
  label: string;
  bold?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  const baseClasses =
    "flex items-center justify-between w-full px-4 py-[10px] text-[0.87rem] text-gray-700 hover:bg-[#f7f5f9] transition-colors duration-150 cursor-pointer";
  const fontWeight = bold ? "font-semibold" : "font-normal";

  // Contenido del item del menu
  const content = (
    <>
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#875B9A] text-white text-[10px] font-bold leading-none">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </>
  );

  if (href) { // Si tiene un href, es un enlace
    return (
      <Link href={href} className={`${baseClasses} ${fontWeight}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  // Si no tiene un href, es un boton
  return (
    <button type="button" className={`${baseClasses} ${fontWeight} text-left`} onClick={onClick}>
      {content}
    </button>
  );
}

// Componente para un divisor del menu
function MenuDivider() {
  return <div className="my-1 h-px bg-gray-100" />;
}

// ── Main Navbar ─────────────────────────────────────────────────────────────

// Componente principal de la barra de navegacion
export default function Navbar({
  initialUser = null,
  hideNavLinks = false,
  logoSubtitle,
}: {
  initialUser?: User | null;
  hideNavLinks?: boolean;
  logoSubtitle?: string;
}) {
  // Estados del componente
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);
  const [isProvider, setIsProvider] = useState(false);
  const [isLoadingProvider, setIsLoadingProvider] = useState(!!initialUser);
  const router = useRouter();
  const supabase = createClient();

  // Ref para deteccion de click fuera del menu
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Obtener usuario y perfil
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        try {
          const profile = await getMyProviderProfile();
          setIsProvider(!!profile);
        } catch(e) {
          setIsProvider(false);
        }
      } else {
        setIsProvider(false);
      }
      setIsLoadingProvider(false);
    };
    getUser();

    // Suscribirse a cambios de autenticacion
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setIsProvider(false);
          setIsLoadingProvider(false);
        } else {
          setIsLoadingProvider(true);
          getMyProviderProfile()
            .then(profile => setIsProvider(!!profile))
            .catch(() => setIsProvider(false))
            .finally(() => setIsLoadingProvider(false));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, initialUser]);

  // Manejador de click fuera del menu
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, handleClickOutside]);

  // Cerrar menu con la tecla Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [dropdownOpen]);

  const closeMenu = () => setDropdownOpen(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    setUser(null);
    setDropdownOpen(false);
    // Usar window.location como un escape para garantizar que las cookies se borren y el layout se desmonte completamente del caché
    window.location.href = "/";
  };

  const userInitial = (
    user?.user_metadata?.display_name?.charAt(0) ||
    user?.user_metadata?.full_name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "U"
  ).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center">

        {/* Izquierda: Logo */}
        <div className="flex items-center">
          <ArtRiderLogo subtitle={logoSubtitle} />
        </div>

        {/* Centro: Navegacion principal - centrado independientemente del ancho de la barra lateral */}
        {!hideNavLinks && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 lg:gap-10">
            {[
              { label: "Categorías", href: "#categorias" },
              { label: "Equipos", href: "#equipos" },
              { label: "Paquetes", href: "#paquetes" }
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-base font-medium text-gray-600 hover:text-[#875B9A] transition-colors"
              >
                {label}
              </Link>
            ))}
            {user && (
              <Link
                href="/bookings"
                className="text-base font-medium text-gray-600 hover:text-[#875B9A] transition-colors"
              >
                Reservas
              </Link>
            )}
          </div>
        )}

        {/* Derecha: Acciones del usuario */}
        <div className="ml-auto flex items-center gap-4">

          {/* Boton CTA externo (izquierda del menu) */}
          {hideNavLinks ? (
            <Link
              href="/"
              className="hidden lg:inline-flex items-center justify-center h-[42px] px-4
                text-[0.88rem] font-semibold text-gray-800
                bg-transparent hover:bg-gray-100
                rounded-full transition-colors whitespace-nowrap"
            >
              Panel Principal
            </Link>
          ) : isLoadingProvider ? (
             <div className="hidden lg:inline-flex items-center justify-center h-[42px] px-4 w-[160px]">
               <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
             </div>
          ) : isProvider ? (
            /* Estado 3: Proveedor → Panel de proveedor */
            <Link
              href="/provider"
              className="hidden lg:inline-flex items-center justify-center h-[42px] px-4
                text-[0.88rem] font-semibold text-gray-800
                bg-transparent hover:bg-gray-100
                rounded-full transition-colors whitespace-nowrap"
            >
              Panel de proveedor
            </Link>
          ) : (
            /* Estado 1 & 2: Guest or Client → Conviértete en proveedor */
            <Link
              href="/become-a-provider"
              className="hidden lg:inline-flex items-center justify-center h-[42px] px-4
                text-[0.88rem] font-semibold text-gray-800
                bg-transparent hover:bg-gray-100
                rounded-full transition-colors whitespace-nowrap"
            >
              Conviértete en proveedor
            </Link>
          )}

          {/* Trigger + Contenedor del dropdown */}
          <div className="relative flex items-center gap-2.5" ref={dropdownRef}>

            {/* Trigger: Renderizado condicional basado en el estado de autenticación */}

            {user ? (
              /* State 2 & 3: Usuario autenticado → Avatar circle (navega a /profile) */
              <Link
                href="/profile"
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center
                  text-white overflow-hidden shrink-0
                  bg-gray-900 hover:bg-gray-800 transition-all duration-200"
              >
                <span className="font-bold text-[0.9rem] select-none">
                  {userInitial}
                </span>
              </Link>
            ) : (
              /* State 1: Usuario no autenticado → Avatar circle (navega a /profile) */
              <div
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center
                  bg-gray-100 hover:bg-gray-200 shrink-0 transition-all duration-200 cursor-default"
              >
                {/* Icono de ubicación / pin de mapa */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            )}

            {/* Hamburger circle (siempre visible) */}
            <button
              id="user-menu-trigger"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              className={`
                w-[42px] h-[42px] rounded-full flex items-center justify-center
                bg-white shrink-0 cursor-pointer
                border transition-all duration-200
                ${dropdownOpen
                  ? "border-gray-400 shadow-md"
                  : "border-gray-300 hover:shadow-md hover:border-gray-400"
                }
              `}
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#374151"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            {/* DROPDOWN MENU: 3 estados estrictos */}
            {dropdownOpen && (
              <div
                id="user-dropdown-menu"
                role="menu"
                className="
                  absolute right-0 top-full mt-3 w-[260px]
                  bg-white rounded-2xl
                  shadow-[0_2px_16px_rgba(0,0,0,0.12)]
                  border border-gray-100
                  py-2
                  z-[60]
                "
              >
                {!user ? (
                  /* State 1: No autenticado */
                  <>
                    <MenuItem
                      href="/register"
                      label="Regístrate"
                      bold
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/login"
                      label="Iniciar sesión"
                      onClick={closeMenu}
                    />

                    <MenuDivider />

                    <MenuItem
                      href="/become-a-provider"
                      label="Conviértete en proveedor"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/help"
                      label="Centro de ayuda"
                      onClick={closeMenu}
                    />
                  </>
                ) : !isProvider ? (
                  /* State 2: Logged in — Client only */
                  <>
                    <MenuItem
                      href="/messages"
                      label="Mensajes"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/bookings"
                      label="Reservas"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/favoritos"
                      label="Favoritos"
                      onClick={closeMenu}
                    />

                    <MenuDivider />

                    <MenuItem
                      href="/become-a-provider"
                      label="Conviértete en proveedor"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/profile"
                      label="Cuenta"
                      onClick={closeMenu}
                    />

                    <MenuDivider />

                    <MenuItem
                      label="Cerrar sesión"
                      onClick={() => {
                        closeMenu();
                        handleSignOut();
                      }}
                    />
                  </>
                ) : (
                  /* State 3: Logged in — Provider */
                  <>
                    <MenuItem
                      href="/messages"
                      label="Mensajes"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/bookings"
                      label="Reservas"
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/favoritos"
                      label="Favoritos"
                      onClick={closeMenu}
                    />

                    <MenuDivider />

                    <MenuItem
                      href="/provider"
                      label="Panel de Proveedor"
                      bold
                      onClick={closeMenu}
                    />
                    <MenuItem
                      href="/profile"
                      label="Cuenta"
                      onClick={closeMenu}
                    />

                    <MenuDivider />

                    <MenuItem
                      label="Cerrar sesión"
                      onClick={() => {
                        closeMenu();
                        handleSignOut();
                      }}
                    />
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
