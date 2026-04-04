import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { signOut } from "@/services/authService";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  // Load from public database schema profile
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, kyc_status")
    .eq("id", data.user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <form action={signOut}>
            <button 
              type="submit" 
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Sign out
            </button>
          </form>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border bg-gray-50 p-6">
            <h2 className="text-lg font-medium text-gray-900">Account Details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900">{data.user.email}</dd>
              </div>
              {profile && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{profile.first_name} {profile.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">KYC Status</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {profile.kyc_status}
                      </span>
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
