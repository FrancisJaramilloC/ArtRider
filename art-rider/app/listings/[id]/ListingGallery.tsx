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
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const markFailed = (i: number) => setFailed(p => ({ ...p, [i]: true }));

  // Only real images — no nulls
  const images = [mainImage, ...(galleryImages ?? [])]
    .filter((x): x is string => Boolean(x));

  const displayCount = totalPhotos ?? images.length;

  const ShowAllBtn = () => (
    <button className="absolute right-4 bottom-4 flex items-center gap-2 bg-white text-gray-900 text-[13px] font-bold px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,0,0,.18)] border border-black/5 hover:scale-[1.03] active:scale-[.98] transition-transform">
      <span className="grid grid-cols-2 gap-[2.5px]">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="w-[5px] h-[5px] rounded-[1.5px] bg-gray-900" />
        ))}
      </span>
      Mostrar las {displayCount} fotos
    </button>
  );

  const Tile = ({ idx, className }: { idx: number; className?: string }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4] ${className ?? ""}`}>
      {images[idx] && !failed[idx] ? (
        <Image
          src={images[idx]}
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

  // 0 images
  if (images.length === 0) {
    return (
      <div className="relative rounded-[20px] overflow-hidden mb-10 h-[460px] bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4] flex items-center justify-center">
        <LayoutGrid size={48} className="text-[#875B9A]/30" />
      </div>
    );
  }

  // 1 image — full width
  if (images.length === 1) {
    return (
      <div className="relative rounded-[20px] overflow-hidden mb-10 h-[460px] bg-gradient-to-br from-[#efeaf9] to-[#e3dbf4]">
        {!failed[0] ? (
          <Image
            src={images[0]}
            alt={title}
            fill
            className="object-cover"
            priority
            onError={() => markFailed(0)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#875B9A]/20 to-[#6a437a]/20">
            <LayoutGrid size={48} className="text-[#875B9A]/40" />
          </div>
        )}
        <ShowAllBtn />
      </div>
    );
  }

  // 2 images — side by side
  if (images.length === 2) {
    return (
      <div
        className="relative rounded-[20px] overflow-hidden mb-10"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "9px", height: "460px" }}
      >
        <Tile idx={0} />
        <Tile idx={1} />
        <ShowAllBtn />
      </div>
    );
  }

  // 3+ images — main spans 2 rows, sides fill in
  const sideCount = Math.min(images.length - 1, 4);
  const cols = sideCount >= 3 ? "2fr 1fr 1fr" : "2fr 1fr";

  return (
    <div
      className="relative rounded-[20px] overflow-hidden mb-10"
      style={{ display: "grid", gridTemplateColumns: cols, gridTemplateRows: "1fr 1fr", gap: "9px", height: "460px" }}
    >
      <Tile idx={0} className="[grid-row:1/span_2]" />
      {Array.from({ length: sideCount }, (_, i) => (
        <Tile key={i + 1} idx={i + 1} />
      ))}
      <ShowAllBtn />
    </div>
  );
}
