"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ConversationSummary, Message } from "@/services/messagesService";
import {
  sendMessage,
  archiveConversation,
  unarchiveConversation,
  softDeleteConversation,
} from "@/services/messagesService";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Props {
  conversations: ConversationSummary[];
  selectedId?: string;
  initialMessages?: Message[];
  currentUserId: string;
}

type Tab = "inbox" | "archived";

interface ToastState {
  text: string;
  type: "success" | "error";
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const SPANISH_MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatDayDivider(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return "Hoy";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Ayer";
  return `${d.getDate()} de ${SPANISH_MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

function statusPillStyle(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-gray-100 text-gray-500";
    case "cancelled":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

// ─────────────────────────────────────────────
// Icons (inline SVG to avoid extra deps)
// ─────────────────────────────────────────────
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
      <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22 11 13 2 9l20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-400" stroke="currentColor" strokeWidth={2}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-gray-400" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-red-500" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-green-400" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function UnreadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// UnreadBadge
// ─────────────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-[#875B9A] text-white text-[11px] font-bold min-w-[19px] h-[19px] rounded-full flex items-center justify-center px-1 shrink-0">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─────────────────────────────────────────────
// ConvoItem
// ─────────────────────────────────────────────
function ConvoItem({
  convo,
  selected,
  onSelect,
  onMenuToggle,
  menuOpen,
  onArchive,
  onUnarchive,
  onDelete,
  onMarkUnread,
}: {
  convo: ConversationSummary;
  selected: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  menuOpen: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onMarkUnread: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, onMenuToggle]);

  return (
    <div className="relative group">
      <div
        onClick={onSelect}
        className={`relative flex gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
          selected
            ? "bg-[#875B9A]/[0.08]"
            : "hover:bg-gray-50"
        }`}
      >
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[14px] shrink-0 mt-0.5"
          style={{ backgroundColor: convo.other_color }}
        >
          {convo.cover_image_url ? (
            <img
              src={convo.cover_image_url}
              alt={convo.other_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            convo.other_initials
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + time */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {convo.unread_count > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#875B9A] shrink-0" />
              )}
              <span
                className={`text-[13.5px] truncate ${
                  convo.unread_count > 0
                    ? "font-bold text-gray-900"
                    : "font-semibold text-gray-800"
                }`}
              >
                {convo.other_name}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">
              {convo.last_message_time}
            </span>
          </div>

          {/* Row 2: equipment */}
          {convo.equipment_title && (
            <p className="text-[11.5px] text-[#875B9A] font-medium truncate mb-0.5">
              {convo.equipment_title}
            </p>
          )}

          {/* Row 3: preview + badge */}
          <div className="flex items-center justify-between gap-1">
            <p
              className={`text-[12.5px] truncate ${
                convo.unread_count > 0
                  ? "font-semibold text-gray-700"
                  : "text-gray-500"
              }`}
            >
              {convo.last_message_is_mine ? "Tú: " : ""}
              {convo.last_message_text}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusPillStyle(
                  convo.status
                )}`}
              >
                {statusLabel(convo.status)}
              </span>
              <UnreadBadge count={convo.unread_count} />
            </div>
          </div>
        </div>

        {/* Context menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle();
          }}
          className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <DotsIcon />
        </button>
      </div>

      {/* Context menu dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-10 z-50 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onMarkUnread(); onMenuToggle(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UnreadIcon />
            Marcar no leído
          </button>
          {convo.is_archived ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnarchive(); onMenuToggle(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArchiveIcon />
              Desarchivar
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); onMenuToggle(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArchiveIcon />
              Archivar
            </button>
          )}
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); onMenuToggle(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
          >
            <TrashIcon />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ChatPanel
// ─────────────────────────────────────────────
function ChatPanel({
  convo,
  messages,
  currentUserId,
  text,
  setText,
  sending,
  onSend,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  convo: ConversationSummary;
  messages: Message[];
  currentUserId: string;
  text: string;
  setText: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!headerMenu) return;
    function handleClick(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [headerMenu]);

  const isLocked = convo.status !== "active";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && !sending && !isLocked) onSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] shrink-0"
          style={{ backgroundColor: convo.other_color }}
        >
          {convo.cover_image_url ? (
            <img
              src={convo.cover_image_url}
              alt={convo.other_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            convo.other_initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate leading-tight">
            {convo.other_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {convo.equipment_title && (
              <span className="text-[12px] text-[#875B9A] font-medium truncate">
                {convo.equipment_title}
              </span>
            )}
            {convo.equipment_title && (
              <span className="text-gray-300 text-[12px]">·</span>
            )}
            <span
              className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${statusPillStyle(
                convo.status
              )}`}
            >
              {statusLabel(convo.status)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {convo.listing_id && (
            <a
              href={`/listings/${convo.listing_id}`}
              className="text-[12px] font-semibold text-[#875B9A] border border-[#875B9A]/30 rounded-full px-3 py-1.5 hover:bg-[#875B9A]/5 transition-colors"
            >
              Ver equipo
            </a>
          )}
          <div className="relative" ref={headerMenuRef}>
            <button
              onClick={() => setHeaderMenu((v) => !v)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <DotsIcon />
            </button>
            {headerMenu && (
              <div className="absolute right-0 top-10 z-50 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden">
                {convo.is_archived ? (
                  <button
                    onClick={() => { onUnarchive(); setHeaderMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ArchiveIcon />
                    Desarchivar
                  </button>
                ) : (
                  <button
                    onClick={() => { onArchive(); setHeaderMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ArchiveIcon />
                    Archivar
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { onDelete(); setHeaderMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Booking card ── */}
      {convo.booking_id && (
        <div className="mx-4 mt-3 shrink-0">
          <div className="border border-gray-100 rounded-2xl flex items-center gap-3 px-4 py-3 bg-gray-50/50">
            {convo.cover_image_url && (
              <img
                src={convo.cover_image_url}
                alt={convo.equipment_title}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 truncate">
                {convo.equipment_title}
              </p>
              {convo.booking_dates && (
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {convo.booking_dates}
                </p>
              )}
              {convo.booking_total != null && (
                <p className="text-[12px] font-semibold text-[#875B9A] mt-0.5">
                  {(convo.booking_total / 100).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              )}
            </div>
            <a
              href={`/bookings/${convo.booking_id}`}
              className="shrink-0 text-[11.5px] font-semibold text-[#875B9A] bg-[#875B9A]/10 rounded-xl px-3 py-2 hover:bg-[#875B9A]/20 transition-colors"
            >
              Ver reserva
            </a>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5"
      >
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === currentUserId;
          const showDivider =
            idx === 0 ||
            !sameDay(messages[idx - 1].created_at, msg.created_at);

          return (
            <div key={msg.id}>
              {showDivider && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                    {formatDayDivider(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              <div
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[62%] px-4 py-3 text-[14px] leading-relaxed ${
                    isMine
                      ? "bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white rounded-[18px] rounded-br-[6px] shadow-[0_6px_16px_-8px_rgba(135,91,154,.5)]"
                      : "bg-gray-100 text-gray-900 rounded-[18px] rounded-bl-[6px]"
                  }`}
                >
                  {msg.content}
                  <span
                    className={`text-[9.5px] font-semibold opacity-60 ml-3 mt-1 float-right ${
                      isMine ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {formatTimestamp(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-gray-400" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-gray-400">Inicia la conversación</p>
            <p className="text-[12px] text-gray-300">Escribe un mensaje abajo</p>
          </div>
        )}
      </div>

      {/* ── Locked banner ── */}
      {isLocked && (
        <div className="px-4 pb-3 shrink-0">
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-gray-500 mx-auto max-w-[80%]">
            <LockIcon />
            Esta conversación está cerrada
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      {!isLocked && (
        <div className="px-4 pb-4 shrink-0">
          <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#875B9A] focus-within:ring-2 focus-within:ring-[#875B9A]/20 transition-all">
            <button className="p-1.5 shrink-0 mb-0.5 hover:bg-gray-100 rounded-lg transition-colors">
              <PaperclipIcon />
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none py-1.5 max-h-32 leading-relaxed"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={onSend}
              disabled={!text.trim() || sending}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-[#875B9A] to-[#6a437a] text-white flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#875B9A]/10 to-[#6a437a]/10 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-[#875B9A]/60" stroke="currentColor" strokeWidth={1.4}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[16px] font-bold text-gray-700 mb-1">Tus mensajes</p>
        <p className="text-[13px] text-gray-400 max-w-[220px]">
          Selecciona una conversación para ver los mensajes
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DeleteDialog
// ─────────────────────────────────────────────
function DeleteDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[340px] p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <TrashIcon />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-gray-900 mb-1">
            ¿Eliminar conversación?
          </p>
          <p className="text-[13px] text-gray-500">
            Tu conversación con{" "}
            <span className="font-semibold text-gray-700">{name}</span> se
            eliminará solo para ti.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-[13px] font-semibold hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 bg-gray-900 text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-2xl animate-fade-in-up">
      {toast.type === "success" ? (
        <CheckIcon />
      ) : (
        <span className="text-red-400">✕</span>
      )}
      {toast.text}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function MessagesClient({
  conversations,
  selectedId,
  initialMessages = [],
  currentUserId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [convos, setConvos] = useState<ConversationSummary[]>(conversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [tab, setTab] = useState<Tab>("inbox");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const selectedConvo = convos.find((c) => c.id === selectedId) ?? null;

  // ── Toast helper ──
  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Sync conversations when prop changes ──
  useEffect(() => {
    setConvos(conversations);
  }, [conversations]);

  // ── Sync messages when initialMessages changes ──
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!selectedId) return;

    const channel = supabase
      .channel(`messages:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Update last message in convos
          setConvos((prev) =>
            prev.map((c) => {
              if (c.id !== selectedId) return c;
              return {
                ...c,
                last_message_text: newMsg.content,
                last_message_time: new Date(newMsg.created_at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
                last_message_is_mine: newMsg.sender_id === currentUserId,
                unread_count:
                  newMsg.sender_id !== currentUserId
                    ? c.unread_count + 1
                    : c.unread_count,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, currentUserId, supabase]);

  // ── Filtered lists ──
  const filteredConvos = convos.filter((c) => {
    const matchesTab = tab === "archived" ? c.is_archived : !c.is_archived;
    const matchesQuery =
      !query ||
      c.other_name.toLowerCase().includes(query.toLowerCase()) ||
      c.equipment_title.toLowerCase().includes(query.toLowerCase()) ||
      c.last_message_text.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const inboxCount = convos.filter((c) => !c.is_archived).reduce(
    (acc, c) => acc + c.unread_count,
    0
  );
  const archivedCount = convos.filter((c) => c.is_archived).length;

  // ── Handlers ──
  const handleSelect = (id: string) => {
    router.push(`/mensajes/${id}`);
  };

  const handleSend = async () => {
    if (!text.trim() || sending || !selectedId) return;
    setSending(true);
    const optimisticMsg: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: selectedId,
      sender_id: currentUserId,
      content: text.trim(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");

    try {
      const saved = await sendMessage(selectedId, optimisticMsg.content, currentUserId);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? saved : m))
      );
      setConvos((prev) =>
        prev.map((c) => {
          if (c.id !== selectedId) return c;
          return {
            ...c,
            last_message_text: saved.content,
            last_message_time: new Date(saved.created_at).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            last_message_is_mine: true,
          };
        })
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      showToast("Error al enviar el mensaje", "error");
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (convo: ConversationSummary) => {
    setConvos((prev) =>
      prev.map((c) => (c.id === convo.id ? { ...c, is_archived: true } : c))
    );
    try {
      await archiveConversation(convo.id, currentUserId);
      showToast("Conversación archivada");
    } catch {
      setConvos((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, is_archived: false } : c))
      );
      showToast("Error al archivar", "error");
    }
  };

  const handleUnarchive = async (convo: ConversationSummary) => {
    setConvos((prev) =>
      prev.map((c) => (c.id === convo.id ? { ...c, is_archived: false } : c))
    );
    try {
      await unarchiveConversation(convo.id, currentUserId);
      showToast("Conversación desarchivada");
    } catch {
      setConvos((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, is_archived: true } : c))
      );
      showToast("Error al desarchivar", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setConvos((prev) => prev.filter((c) => c.id !== target.id));
    try {
      await softDeleteConversation(target.id, currentUserId);
      showToast("Conversación eliminada");
      if (selectedId === target.id) {
        router.push("/mensajes");
      }
    } catch {
      setConvos((prev) => [target, ...prev]);
      showToast("Error al eliminar", "error");
    }
  };

  const handleMarkUnread = (convoId: string) => {
    setConvos((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? { ...c, unread_count: Math.max(c.unread_count, 1), last_message_is_mine: false }
          : c
      )
    );
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* ════════════════════════════════════════
          LEFT PANEL — Conversation list
      ════════════════════════════════════════ */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-gray-100">
        {/* Head */}
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight">
            Mensajes
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 my-3">
            <button
              onClick={() => setTab("inbox")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                tab === "inbox"
                  ? "bg-[#875B9A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Bandeja
              {inboxCount > 0 && (
                <span
                  className={`text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 ${
                    tab === "inbox"
                      ? "bg-white/25 text-white"
                      : "bg-[#875B9A] text-white"
                  }`}
                >
                  {inboxCount > 99 ? "99+" : inboxCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("archived")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors ${
                tab === "archived"
                  ? "bg-[#875B9A] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Archivados
              {archivedCount > 0 && (
                <span
                  className={`text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 ${
                    tab === "archived"
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center bg-gray-100 rounded-full h-10 px-4 gap-2">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="flex-1 bg-transparent text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-[13px] font-semibold text-gray-400">
                {query
                  ? "Sin resultados"
                  : tab === "archived"
                  ? "No hay archivados"
                  : "No hay mensajes"}
              </p>
            </div>
          ) : (
            filteredConvos.map((convo) => (
              <ConvoItem
                key={convo.id}
                convo={convo}
                selected={convo.id === selectedId}
                onSelect={() => handleSelect(convo.id)}
                onMenuToggle={() =>
                  setMenuOpen((prev) => (prev === convo.id ? null : convo.id))
                }
                menuOpen={menuOpen === convo.id}
                onArchive={() => handleArchive(convo)}
                onUnarchive={() => handleUnarchive(convo)}
                onDelete={() => setDeleteTarget(convo)}
                onMarkUnread={() => handleMarkUnread(convo.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          RIGHT PANEL — Chat
      ════════════════════════════════════════ */}
      <div className="flex-1 min-w-0">
        {selectedConvo ? (
          <ChatPanel
            convo={selectedConvo}
            messages={messages}
            currentUserId={currentUserId}
            text={text}
            setText={setText}
            sending={sending}
            onSend={handleSend}
            onArchive={() => handleArchive(selectedConvo)}
            onUnarchive={() => handleUnarchive(selectedConvo)}
            onDelete={() => setDeleteTarget(selectedConvo)}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* ── Delete dialog ── */}
      {deleteTarget && (
        <DeleteDialog
          name={deleteTarget.other_name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast toast={toast} />}
    </div>
  );
}
