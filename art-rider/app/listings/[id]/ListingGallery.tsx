"use client";

import { useState } from "react";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";

interface ListingGalleryProps {
  mainImage: string | null;
  galleryImages: string[] | null;
  title: string;
  totalPhotos?: number;
}

export default function ListingGallery({
  mainImage,
  galleryImages,
  title,
  totalPhotos,
}: ListingGalleryProps) {
  // Track which images failed to load
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const markFailed = (i: number) => setFailed(p => ({ ...p, [i]: true }));

  // slots: [main, t1, t2, t3, t4]
  const all = [mainImage, ...(galleryImages ?? [])];
  const photoCount = totalPhotos ?? all.filter(Boolean).length;

  const Tile = ({ idx, className }: { idx: number; className?: string }) => {
    const src = all[idx];
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4] ${className ?? ""}`}>
        {src && !failed[idx] ? (
          <Image
            src={src}
            alt={`${title} — foto ${idx + 1}`}
            fill
            className="object-cover transition-all duration-500 hover:scale-105 hover:brightness-95 cursor-pointer"
            sizes="(max-width: 1200px) 60vw, 720px"
            priority={idx === 0}
            onError={() => markFailed(idx)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#875B9A]/20 to-[#6a437a]/20">
            <LayoutGrid size={36} className="text-[#875B9A]/40" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative rounded-[20px] overflow-hidden mb-10" style={{
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "9px",
      height: "460px",
    }}>
      {/* Main image — spans both rows */}
      <Tile idx={0} className="[grid-row:1/span_2]" />
      <Tile idx={1} />
      <Tile idx={2} />
      <Tile idx={3} />
      <Tile idx={4} />

      {/* Show all photos button */}
      <button className="absolute right-4 bottom-4 flex items-center gap-2 bg-white text-gray-900 text-[13px] font-bold px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,0,0,.18)] border border-black/5 hover:scale-[1.03] active:scale-[.98] transition-transform">
        <span className="grid grid-cols-2 gap-[2.5px]">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="w-[5px] h-[5px] rounded-[1.5px] bg-gray-900" />
          ))}
        </span>
        Mostrar las {photoCount} fotos
      </button>
    </div>
  );
}
