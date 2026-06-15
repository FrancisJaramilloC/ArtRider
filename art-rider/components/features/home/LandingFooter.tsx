import Link from "next/link";
import ArtRiderLogo from "@/components/layout/ArtRiderLogo";

const COLS = [
  {
    heading: "Asistencia",
    links: [
      "RiderSupport",
      "Ayuda con un problema de seguridad",
      "SafeRider (Garantía)",
      "Opciones de cancelación",
      "Problemas en tu evento",
    ],
  },
  {
    heading: "Modo proveedor",
    links: [
      "Pon tu equipo en ArtRider",
      "Ofrece tus servicios audiovisuales",
      "SafeRider para proveedores",
      "Recursos para proveedores",
      "Foro comunitario",
    ],
  },
  {
    heading: "ArtRider",
    links: [
      "Novedades de 2026",
      "Sala de prensa",
      "Carreras",
      "Inversionistas",
      "Eventos comunitarios",
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-8">
      <div className="max-w-[1240px] mx-auto px-8 pt-[46px] pb-[30px] grid grid-cols-2 md:grid-cols-4 gap-10">
        {COLS.map(col => (
          <div key={col.heading}>
            <h4 className="text-[14px] font-extrabold text-gray-900 mb-4">{col.heading}</h4>
            <ul className="space-y-3">
              {col.links.map(l => (
                <li key={l}>
                  <Link
                    href="#"
                    className="text-[13.5px] text-gray-500 font-medium hover:text-[#6a437a] hover:underline transition-colors"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* CTA column */}
        <div className="flex flex-col items-start gap-3">
          <ArtRiderLogo />
          <p className="text-[13.5px] text-gray-400 font-medium leading-relaxed">
            La plataforma peer-to-peer de alquiler de equipos para eventos en Ecuador.
          </p>
          <Link
            href="/become-a-provider"
            className="inline-block bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white text-[14px] font-bold px-5 py-3 rounded-xl shadow-[0_8px_20px_-8px_rgba(135,91,154,.6)] hover:brightness-105 active:scale-[.98] transition-all"
          >
            Publica tu equipo
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1240px] mx-auto px-8 py-5 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap text-[13px] text-gray-500 font-medium">
        <span>© 2026 ArtRider, Inc. · Privacidad · Términos · Mapa del sitio</span>
        <span className="flex items-center gap-2">
          🌐 Español (EC) · $ USD
        </span>
      </div>
    </footer>
  );
}
