import { getMyProviderProfile } from "@/services/providerService";
import { redirect } from "next/navigation";
import ProviderLayoutClient from "./ProviderLayoutClient";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const provider = await getMyProviderProfile();

  if (!provider) {
    redirect("/become-a-provider");
  }

  // Pending State
  if (provider.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">En Verificación</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Tu cuenta de proveedor <strong>{provider.brand_name}</strong> está en proceso de revisión manual. Este proceso suele tomar de 1 a 3 días hábiles.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-gray-900 font-semibold bg-gray-100 hover:bg-gray-200 w-full py-4 rounded-2xl transition-colors"
          >
            Volver a mi cuenta de cliente
          </Link>
        </div>
      </div>
    );
  }

  // Suspended State
  if (provider.status === "suspended") {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-3">Cuenta Suspendida</h1>
          <p className="text-gray-600 mb-8">
            Tu cuenta de proveedor ha sido temporalmente inhabilitada por un administrador.
          </p>
          <Link href="/" className="text-gray-900 font-semibold hover:underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  // Active State
  return (
    <ProviderLayoutClient provider={provider} initialUser={user ?? null}>
      {children}
    </ProviderLayoutClient>
  );
}
