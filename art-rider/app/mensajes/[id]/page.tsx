import Navbar from "@/components/layout/Navbar";
import { getMessages, getConversationAboutItem, getConversations, type Message, type ConversationAboutItem } from "@/services/messagesService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/messages/ChatRoom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Chat | ArtRider",
};

export default async function MensajeDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ providerId?: string; listingId?: string; packageId?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { providerId, listingId, packageId } = await searchParams;

  let initialMessages: Message[] = [];
  let aboutItem: ConversationAboutItem | null = null;
  let otherName = "Usuario";

  if (id !== "new") {
    initialMessages = await getMessages(id);
    aboutItem = await getConversationAboutItem(id);
    // Find other participant's name from getConversations
    const allConvs = await getConversations();
    const conv = allConvs.find(c => c.id === id);
    if (conv) {
      otherName = conv.other_name;
    }
  } else {
    // If it's new, we don't have an ID yet, we'll create it on the fly when they send a message
    // We can fetch the provider's name to show
    if (providerId) {
      const { data: providerData } = await supabase.from('providers').select('brand_name').eq('id', providerId).single();
      if (providerData) otherName = providerData.brand_name;
    }
    // And fetch the listing/package info to populate aboutItem manually if needed, 
    // but the subagent's ChatRoom might just wait for creation. Let's just pass null for now if new.
  }

  return (
    <div className="flex flex-col h-screen bg-white md:bg-gray-50 overflow-hidden">
      <Navbar initialUser={user} />
      
      <main className="flex-1 flex flex-col pt-16 md:pt-24 md:pb-6 max-w-4xl mx-auto w-full md:px-6 overflow-hidden">
        
        {/* Mobile back button & header context */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-gray-100 bg-white shadow-sm shrink-0 z-10 relative">
          <Link href="/mensajes" className="p-2 -ml-2 mr-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">{otherName}</span>
          </div>
        </div>

        {/* Desktop back button */}
        <div className="hidden md:flex items-center mb-4 shrink-0">
          <Link href="/mensajes" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors">
            <ArrowLeft size={16} /> Volver a mensajes
          </Link>
        </div>

        <div className="flex-1 bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 overflow-hidden flex flex-col relative z-0">
          <ChatRoom 
            conversationId={id}
            currentUserId={user.id}
            initialMessages={initialMessages}
            aboutItem={aboutItem}
            otherParticipantName={otherName}
          />
        </div>
      </main>
    </div>
  );
}
