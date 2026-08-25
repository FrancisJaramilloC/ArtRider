import { ChatList } from "@/components/messages/ChatList";
import { getConversations } from "@/services/messagesService";
import { getMyProviderProfile } from "@/services/providerService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Mensajes | Panel de Proveedor",
};

export default async function ProviderMensajesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const provider = await getMyProviderProfile();
  if (!provider) {
    redirect("/become-a-provider");
  }

  const allConversations = await getConversations();
  
  // Filter only conversations where this user is the provider
  const providerConversations = allConversations.filter(c => c.provider_id === provider.id);

  async function fetchProviderConversations() {
    "use server";
    const all = await getConversations();
    return all.filter(c => c.provider_id === provider?.id);
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-4 sm:p-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Mensajes</h1>
        <p className="text-gray-500 font-medium">Gestiona las consultas de tus clientes.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[60vh]">
        <ChatList 
          initialConversations={providerConversations} 
          baseUrl="/provider/mensajes"
          refetchConversations={fetchProviderConversations}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
