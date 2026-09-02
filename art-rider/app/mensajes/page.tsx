import Navbar from "@/components/layout/Navbar";
import { MessagesPanel } from "@/components/messages/MessagesPanel";
import {
  getConversations,
  getMessages,
  getConversationAboutItem,
  getOrCreateConversation,
} from "@/services/messagesService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function MensajesPage({
  searchParams,
}: {
  searchParams: Promise<{
    providerId?: string;
    listingId?: string;
    packageId?: string;
    open?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { providerId, listingId, packageId, open } = await searchParams;

  // If we have a providerId, create/find the conversation and pass its ID to auto-open
  let autoOpenId: string | null = open || null;

  if (providerId && !autoOpenId) {
    try {
      const conversationId = await getOrCreateConversation(
        providerId,
        listingId || null,
        packageId || null
      );
      autoOpenId = conversationId;
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  }

  const initialConversations = await getConversations();

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Navbar initialUser={user} />

      <main className="flex-1 pt-16 md:pt-20 pb-0 md:pb-4 md:px-6 lg:px-8 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">
          <MessagesPanel
            initialConversations={initialConversations}
            refetchConversations={getConversations}
            fetchMessages={getMessages}
            fetchAboutItem={getConversationAboutItem}
            currentUserId={user.id}
            autoOpenConversationId={autoOpenId}
          />
        </div>
      </main>
    </div>
  );
}
