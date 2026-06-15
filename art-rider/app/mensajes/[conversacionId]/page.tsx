import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Navbar from "@/components/layout/Navbar";
import MessagesClient from "@/components/messages/MessagesClient";
import {
  getConversations,
  getMessages,
  markMessagesRead,
} from "@/services/messagesService";

interface Props {
  params: Promise<{ conversacionId: string }>;
}

export default async function ConversacionPage({ params }: Props) {
  const { conversacionId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/mensajes/${conversacionId}`);
  }

  // Fetch conversations and messages in parallel
  const [conversations, initialMessages] = await Promise.all([
    getConversations(user.id),
    getMessages(conversacionId),
  ]);

  // Mark messages as read server-side
  await markMessagesRead(conversacionId, user.id);

  return (
    <>
      <Navbar initialUser={user} />
      <MessagesClient
        conversations={conversations}
        selectedId={conversacionId}
        initialMessages={initialMessages}
        currentUserId={user.id}
      />
    </>
  );
}
