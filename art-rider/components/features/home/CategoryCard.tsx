"use client";

// Card de categoria premium
// Imagen de fondo completa con overlay de gradiente oscuro y titulo + etiqueta "Explorar" en la parte inferior izquierda
// Animacion suave al pasar el mouse con escala y sombra

import Image from "next/image";
import Link from "next/link";

// Props de la card de categoria
export interface CategoryCardProps {
  // Nombre de la categoria
  title: string;
  // Ruta de la imagen de fondo
  imageSrc: string;
  // URL a la que enlaza la card
  href: string;
}

// Componente de la card de categoria
export default function CategoryCard({
  title,
  imageSrc,
  href,
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className="
        relative block rounded-2xl overflow-hidden cursor-pointer no-underline
        h-[170px] sm:h-[220px] md:h-[270px] min-w-[180px] sm:min-w-[210px] lg:min-w-0 lg:flex-1 shrink-0
        group transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(135,91,154,0.2)]
      "
      aria-label={`Explorar categoría: ${title}`}
    >
      {/* Imagen de fondo */}
      <Image
        src={imageSrc}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        sizes="(max-width: 1024px) 280px, 20vw"
      />

      {/* Overlay de gradiente oscuro */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/25 to-black/75 transition-opacity duration-300 group-hover:to-black/65"
      />

      {/* Contenido en la parte inferior izquierda */}
      <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 flex flex-col gap-0.5 sm:gap-1">
        {/* Nombre de la categoria */}
        <span className="text-white font-bold text-base sm:text-lg leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
          {title}
        </span>

        {/* Etiqueta Explorar */}
        <span className="text-white/70 text-sm font-medium tracking-wide group-hover:text-white/90 transition-colors duration-300">
          Explorar
        </span>
      </div>
    </Link>
  );
}
