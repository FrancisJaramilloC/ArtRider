import { MessagesPanel } from "@/components/messages/MessagesPanel";
import { getConversations, getMessages, getConversationAboutItem } from "@/services/messagesService";
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
  const providerConversations = allConversations.filter(c => c.provider_id === provider.id);

  async function fetchProviderConversations() {
    "use server";
    const all = await getConversations();
    return all.filter(c => c.provider_id === provider?.id);
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full max-w-6xl mx-auto p-4 sm:p-6">
      <MessagesPanel
        initialConversations={providerConversations}
        refetchConversations={fetchProviderConversations}
        fetchMessages={getMessages}
        fetchAboutItem={getConversationAboutItem}
        currentUserId={user.id}
      />
    </div>
  );
}
