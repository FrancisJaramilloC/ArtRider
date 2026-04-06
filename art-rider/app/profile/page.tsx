import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function PersonalInfoPage() {
  const supabase = await createSupabaseServerClient();

  // Explicit backend token resolution parsing
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch contextual user mapping accurately protected by RLS
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="p-8 text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
        Error cargando el perfil. Por favor contacta a soporte.
      </div>
    );
  }

  // Formatting payloads restricting what renders exclusively wrapping into component properties securely.
  const initialData = {
    fullName: profile.full_name || "",
    email: user.email || "", // Absolute mapping directly out of JWT, keeping it out of profiles locally.
    phone: profile.phone || "",
    birthDate: profile.birth_date || "",
    avatarUrl: profile.avatar_url,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Información Personal</h2>
        <p className="text-[0.95rem] text-gray-500 mt-1">
          Administra tus datos privados y de contacto.
        </p>
      </div>

      {/* Encapsulation: Offloading React hooks boundary to separate module keeping routing immutable */}
      <ProfileForm initialData={initialData} />

      {/* ── Secciones Adicionales (Airbnb Style) ── */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition-colors group">
          <div className="text-gray-900 group-hover:text-[#875B9A] transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <line x1="9" y1="10" x2="15" y2="10"></line>
              <line x1="12" y1="10" x2="12" y2="10.01"></line>
            </svg>
          </div>
          <div>
            <h3 className="text-[1.05rem] font-semibold text-gray-900">Reseñas escritas por mí</h3>
            <p className="text-sm text-gray-500">Visualiza las reseñas que has dejado a otros usuarios o equipos.</p>
          </div>
          <div className="ml-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
