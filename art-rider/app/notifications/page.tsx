import { getMyNotifications, markAllAsRead } from "@/services/notificationsService";
import { Bell, CalendarCheck, CalendarX, MessageSquare, ShieldCheck, ShieldAlert, Star, CalendarPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { NotificationType } from "@/services/notificationsService";
import { revalidatePath } from "next/cache";

const ICON_MAP: Record<NotificationType, any> = {
  booking_request: { icon: CalendarPlus, color: "text-blue-500", bg: "bg-blue-50" },
  booking_confirmed: { icon: CalendarCheck, color: "text-green-500", bg: "bg-green-50" },
  booking_cancelled: { icon: CalendarX, color: "text-red-500", bg: "bg-red-50" },
  new_message: { icon: MessageSquare, color: "text-[#875B9A]", bg: "bg-purple-50" },
  identity_verified: { icon: ShieldCheck, color: "text-green-500", bg: "bg-green-50" },
  identity_rejected: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
  review_received: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-50" },
};

export default async function NotificationsPage() {
  const notifications = await getMyNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllAsRead = async () => {
    "use server";
    await markAllAsRead();
    revalidatePath("/notifications");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 mt-1">
            Tienes {unreadCount} {unreadCount === 1 ? "notificación nueva" : "notificaciones nuevas"}.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <form action={handleMarkAllAsRead}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-[#875B9A] bg-[#875B9A]/10 hover:bg-[#875B9A]/20 rounded-full transition-colors"
            >
              Marcar todas como leídas
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Estás al día</h2>
            <p className="text-gray-500 mt-2 max-w-sm">
              Cuando tengas nuevas reservas, mensajes o actualizaciones, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const { icon: Icon, color, bg } = ICON_MAP[n.type];
              
              const content = (
                <div className={`p-6 hover:bg-gray-50 transition-colors flex gap-4 ${!n.is_read ? "bg-blue-50/10" : ""}`}>
                  <div className={`shrink-0 w-12 h-12 rounded-full ${bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${color}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base ${!n.is_read ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="shrink-0 flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#875B9A]" />
                    </div>
                  )}
                </div>
              );

              return n.href ? (
                <Link key={n.id} href={n.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
