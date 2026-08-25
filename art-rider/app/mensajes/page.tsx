import Navbar from "@/components/layout/Navbar";
import LandingFooter from "@/components/features/home/LandingFooter";
import { ChatList } from "@/components/messages/ChatList";
import { getConversations } from "@/services/messagesService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Mensajes | ArtRider",
};

export default async function MensajesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialConversations = await getConversations();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar initialUser={user} />
      
      <main className="flex-1 pt-24 pb-12 max-w-3xl mx-auto w-full px-4 sm:px-6">
        <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-6">Mis Mensajes</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[60vh]">
          <ChatList 
            initialConversations={initialConversations} 
            baseUrl="/mensajes"
            refetchConversations={getConversations}
            currentUserId={user.id}
          />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
