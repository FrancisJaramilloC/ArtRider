"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CalendarCheck, CalendarX, MessageSquare, ShieldCheck, ShieldAlert, Star, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationType } from "@/services/notificationsService";

const ICON_MAP: Record<NotificationType, any> = {
  booking_request: { icon: CalendarPlus, color: "text-blue-500", bg: "bg-blue-50" },
  booking_confirmed: { icon: CalendarCheck, color: "text-green-500", bg: "bg-green-50" },
  booking_cancelled: { icon: CalendarX, color: "text-red-500", bg: "bg-red-50" },
  new_message: { icon: MessageSquare, color: "text-[#875B9A]", bg: "bg-purple-50" },
  identity_verified: { icon: ShieldCheck, color: "text-green-500", bg: "bg-green-50" },
  identity_rejected: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
  review_received: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-50" },
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (id: string, href: string | null) => {
    setIsOpen(false);
    await markAsRead(id);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#875B9A]"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1 border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-[#875B9A] hover:text-[#6a437a] transition-colors"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1} />
                <p className="text-sm font-medium text-gray-900">No tienes notificaciones</p>
                <p className="text-xs text-gray-500 mt-1">
                  Aquí aparecerán tus reservas y mensajes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.slice(0, 10).map((n) => {
                  const { icon: Icon, color, bg } = ICON_MAP[n.type];
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n.id, n.href)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-3 ${
                        !n.is_read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.is_read ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-[#875B9A] mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-sm font-semibold text-gray-700 hover:text-[#875B9A] transition-colors"
              >
                Ver todas las notificaciones
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
