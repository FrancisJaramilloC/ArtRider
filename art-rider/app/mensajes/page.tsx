import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Navbar from "@/components/layout/Navbar";
import MessagesClient from "@/components/messages/MessagesClient";
import { getConversations } from "@/services/messagesService";

export default async function MensajesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mensajes");
  }

  const conversations = await getConversations(user.id);

  return (
    <>
      <Navbar initialUser={user} />
      <MessagesClient
        conversations={conversations}
        currentUserId={user.id}
      />
    </>
  );
}
