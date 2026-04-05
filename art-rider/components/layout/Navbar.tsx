"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function Navbar({ initialUser = null }: { initialUser?: User | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, [supabase, initialUser]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
    setUser(null);
    setMobileMenuOpen(false);
    // Use window.location as an escape hatch to guarantee cookies clear and layout fully unmounts caching
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-[80px] flex items-center justify-between">

        {/* ── Left: Logo ── */}
        <div className="flex-1 flex justify-start items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center bg-gray-900 group-hover:bg-[#875B9A] transition-colors text-white text-sm shrink-0">
              🎧
            </div>
            <span className="font-extrabold text-[1.125rem] text-gray-900 tracking-tight">
              ArtRider
            </span>
          </Link>
        </div>

        {/* ── Center: Main Nav ── */}
        <div className="hidden md:flex flex-1 justify-center items-center gap-8">
          {["Categorías", "Equipos", "Paquetes"].map((label) => (
            <Link
              key={label}
              href="#"
              className="text-[0.95rem] font-medium text-gray-600 hover:text-[#875B9A] transition-colors"
            >
              {label}
            </Link>
          ))}
          {user && (
            <Link
              href="/bookings"
              className="text-[0.95rem] font-medium text-gray-600 hover:text-[#875B9A] transition-colors"
            >
              Mis Reservas
            </Link>
          )}
        </div>

        {/* ── Right: User Actions ── */}
        <div className="flex-1 flex justify-end items-center gap-3">
          {/* Become Provider / Dashboard button */}
          {user?.user_metadata?.role === 'provider' ? (
            <Link
              href="/dashboard"
              className="hidden lg:inline-flex items-center justify-center h-11 text-[0.88rem] font-semibold text-gray-800 hover:bg-gray-50 px-4 rounded-full transition-colors whitespace-nowrap"
            >
              Panel de Proveedor
            </Link>
          ) : (
            <Link
              href="/become-a-provider"
              className="hidden lg:inline-flex items-center justify-center h-11 text-[0.88rem] font-semibold text-gray-800 hover:bg-gray-50 px-4 rounded-full transition-colors whitespace-nowrap"
            >
              Conviértete en proveedor
            </Link>
          )}

          {/* Cart Icon */}
          <button
            aria-label="Carrito"
            className="p-2.5 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </button>

          <div className="relative ml-1">
            {/* Airbnb-style User Pill */}
            <button
              className="flex items-center justify-center gap-3 border border-gray-300 rounded-full p-1.5 pl-3.5 hover:shadow-md transition-shadow bg-white shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {/* Hamburger */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              {/* Avatar Placeholder */}
              <div className={`w-[32px] h-[32px] rounded-full flex items-center justify-center text-white overflow-hidden ${user ? 'bg-[#875B9A]' : 'bg-gray-600'}`}>
                {user ? (
                  <span className="font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px] text-white">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Avatar Dropdown Menu */}
            {mobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {user ? (
                  <>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Editar perfil
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Registrarse
                    </Link>
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
