import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Navbar from "@/components/layout/Navbar";
import MessagesClient from "@/components/messages/MessagesClient";
import { getConversations, getMessages, markMessagesRead } from "@/services/messagesService";

interface Props {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/messages/${chatId}`);
  }

  const [conversations, initialMessages] = await Promise.all([
    getConversations(user.id),
    getMessages(chatId),
  ]);

  await markMessagesRead(chatId, user.id);

  return (
    <>
      <Navbar initialUser={user} />
      <MessagesClient
        conversations={conversations}
        selectedId={chatId}
        initialMessages={initialMessages}
        currentUserId={user.id}
      />
    </>
  );
}
