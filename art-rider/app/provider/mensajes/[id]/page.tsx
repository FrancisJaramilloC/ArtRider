import { getMessages, getConversationAboutItem, getConversations, type Message, type ConversationAboutItem } from "@/services/messagesService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyProviderProfile } from "@/services/providerService";
import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/messages/ChatRoom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Chat | Panel de Proveedor",
};

export default async function ProviderMensajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const provider = await getMyProviderProfile();
  if (!provider) {
    redirect("/become-a-provider");
  }

  const { id } = await params;

  let initialMessages: Message[] = [];
  let aboutItem: ConversationAboutItem | null = null;
  let otherName = "Cliente";

  if (id !== "new") {
    initialMessages = await getMessages(id);
    aboutItem = await getConversationAboutItem(id);
    const allConvs = await getConversations();
    const conv = allConvs.find(c => c.id === id);
    if (conv) {
      otherName = conv.other_name;
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] sm:h-[calc(100vh-40px)] w-full max-w-5xl mx-auto sm:p-4">
      {/* Header back button */}
      <div className="flex items-center mb-4 px-4 sm:px-0 shrink-0 mt-4 sm:mt-0">
        <Link href="/provider/mensajes" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors">
          <ArrowLeft size={16} /> Volver a mensajes
        </Link>
      </div>

      <div className="flex-1 bg-white sm:rounded-3xl shadow-sm sm:border sm:border-gray-100 overflow-hidden flex flex-col relative z-0">
        <ChatRoom 
          conversationId={id}
          currentUserId={user.id}
          initialMessages={initialMessages}
          aboutItem={aboutItem}
          otherParticipantName={otherName}
        />
      </div>
    </div>
  );
}
