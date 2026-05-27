"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Wrapper de carrusel horizontal con flechas de navegación.
 *
 * - Las flechas se muestran/ocultan según si hay contenido para desplazar.
 * - Scroll suave con scrollBy 340px por clic (ancho aprox. de una tarjeta).
 * - Accesible: aria-label en cada botón, tabIndex=-1 cuando están ocultos.
 * - Compatible con el patrón overflow-x: auto ya usado en la homepage.
 */

interface ScrollableCarouselProps {
  children: React.ReactNode;
  /** Clases extra para el contenedor interior (el que hace overflow) */
  innerClassName?: string;
}

export default function ScrollableCarousel({
  children,
  innerClassName,
}: ScrollableCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ResizeObserver para detectar cambios de tamaño del contenido
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    el.addEventListener("scroll", sync, { passive: true });

    // Primera comprobación tras el paint inicial
    const raf = requestAnimationFrame(sync);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  const btnCx = (visible: boolean, side: "left" | "right") =>
    [
      "absolute top-1/2 z-10 w-9 h-9 rounded-full",
      "bg-white border border-gray-200 shadow-md",
      "flex items-center justify-center",
      "text-gray-600 transition-all duration-200",
      "hover:bg-[#875B9A] hover:text-white hover:border-[#875B9A] hover:shadow-lg",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#875B9A]",
      "-translate-y-[calc(50%+8px)]", // centra verticalmente sobre la imagen, no el texto
      side === "left" ? "-left-4" : "-right-4",
      visible ? "opacity-100" : "opacity-0 pointer-events-none",
    ].join(" ");

  return (
    <div className="relative">
      {/* Flecha izquierda */}
      <button
        type="button"
        aria-label="Desplazar a la izquierda"
        tabIndex={canLeft ? 0 : -1}
        onClick={() => scroll("left")}
        className={btnCx(canLeft, "left")}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Contenedor con scroll */}
      <div
        ref={ref}
        className={[
          "-mx-4 sm:-mx-6 lg:mx-0",
          "px-4 sm:px-6 lg:px-0",
          "pb-4 overflow-x-auto flex gap-4 md:gap-5 scroll-smooth",
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          innerClassName ?? "",
        ].join(" ")}
      >
        {children}
      </div>

      {/* Flecha derecha */}
      <button
        type="button"
        aria-label="Desplazar a la derecha"
        tabIndex={canRight ? 0 : -1}
        onClick={() => scroll("right")}
        className={btnCx(canRight, "right")}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
