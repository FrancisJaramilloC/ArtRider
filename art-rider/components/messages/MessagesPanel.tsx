"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  MoreVertical,
  Archive,
  Trash2,
  ArchiveRestore,
  Send,
  Check,
  CheckCheck,
  ArrowLeft,
  MessageCircle,
  Info,
} from "lucide-react";
import {
  ConversationSummary,
  Message,
  ConversationAboutItem,
  archiveConversation,
  unarchiveConversation,
  deleteConversationForMe,
  sendMessage,
  markMessagesRead,
} from "@/services/messagesService";
import {
  subscribeToConversationUpdates,
  subscribeToMessages,
  subscribeToTyping,
  broadcastTyping,
} from "@/services/messagesRealtime";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessagesPanelProps {
  initialConversations: ConversationSummary[];
  refetchConversations: () => Promise<ConversationSummary[]>;
  fetchMessages: (conversationId: string) => Promise<Message[]>;
  fetchAboutItem: (conversationId: string) => Promise<ConversationAboutItem | null>;
  currentUserId: string;
  autoOpenConversationId?: string | null;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MessagesPanel({
  initialConversations,
  refetchConversations,
  fetchMessages,
  fetchAboutItem,
  currentUserId,
  autoOpenConversationId,
}: MessagesPanelProps) {
  // ─── List state ──
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [tab, setTab] = useState<"todos" | "archivados">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ─── Active chat state ──
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aboutItem, setAboutItem] = useState<ConversationAboutItem | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Derived ──
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const filteredConversations = conversations.filter((c) => {
    const matchesTab = tab === "archivados" ? c.is_archived : !c.is_archived;
    const matchesSearch = (c.other_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // ─── Helpers ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // ─── Subscribe to conversation-list updates ──
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToConversationUpdates(currentUserId, async () => {
      try {
        const updated = await refetchConversations();
        setConversations(updated);
      } catch (error) {
        console.error("Failed to refetch conversations:", error);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ─── Subscribe to messages in active chat ──
  useEffect(() => {
    if (!activeConversationId) return;

    markMessagesRead(activeConversationId).catch(console.error);

    const channelMessages = subscribeToMessages(
      activeConversationId,
      (incomingMsg) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        if (incomingMsg.sender_id !== currentUserId) {
          markMessagesRead(activeConversationId).catch(console.error);
        }
      },
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
        );
      }
    );

    const channelTyping = subscribeToTyping(
      activeConversationId,
      currentUserId,
      (typing) => setIsTyping(typing)
    );

    return () => {
      channelMessages.unsubscribe();
      channelTyping.unsubscribe();
    };
  }, [activeConversationId, currentUserId]);

  // ─── Open a conversation ──
  const openConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsLoadingChat(true);
    setMessages([]);
    setAboutItem(null);
    setNewMessage("");
    setIsTyping(false);

    try {
      const [msgs, item] = await Promise.all([
        fetchMessages(conversationId),
        fetchAboutItem(conversationId),
      ]);
      setMessages(msgs);
      setAboutItem(item);
    } catch (error) {
      console.error("Error loading chat:", error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // ─── Auto-open a conversation if directed by URL ──
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (autoOpenConversationId && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openConversation(autoOpenConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenConversationId]);

  // ─── Send message ──
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !activeConversationId) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    broadcastTyping(activeConversationId, currentUserId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversation_id: activeConversationId,
        sender_id: currentUserId,
        content,
        sent_at: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => [...prev, tempMsg]);

      const sentMsg = await sendMessage(activeConversationId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? sentMsg : m))
      );
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // ─── Typing handler ──
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!activeConversationId) return;

    broadcastTyping(activeConversationId, currentUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(activeConversationId, currentUserId, false);
    }, 2000);
  };

  // ─── Archive / Delete ──
  const handleArchiveToggle = async (
    e: React.MouseEvent,
    conversation: ConversationSummary
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (conversation.is_archived) {
        await unarchiveConversation(conversation.id);
      } else {
        await archiveConversation(conversation.id);
      }
      const updated = await refetchConversations();
      setConversations(updated);
    } catch (error) {
      console.error("Error toggling archive status:", error);
    }
    setOpenDropdownId(null);
  };

  const handleDelete = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta conversación?"))
      return;
    try {
      await deleteConversationForMe(conversationId);
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
      const updated = await refetchConversations();
      setConversations(updated);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
    setOpenDropdownId(null);
  };

  // ─── Close dropdown on outside click ──
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Date helpers ──
  const formatMessageTime = (dateString: string) =>
    format(new Date(dateString), "HH:mm", { locale: es });

  const renderMessageDateSeparator = (
    currentMsg: Message,
    previousMsg?: Message
  ) => {
    if (!previousMsg) return true;
    return (
      new Date(currentMsg.sent_at).toDateString() !==
      new Date(previousMsg.sent_at).toDateString()
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ═══════════════════ LEFT SIDEBAR ═══════════════════ */}
      <div
        className={`flex flex-col w-full md:w-[380px] lg:w-[420px] md:max-w-[420px] border-r border-gray-200 shrink-0 ${
          activeConversationId ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mensajes</h2>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
            <button
              onClick={() => setTab("todos")}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === "todos"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTab("archivados")}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === "archivados"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Archivados
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#875B9A]/50 focus:border-[#875B9A] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto" ref={dropdownRef}>
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {tab === "archivados"
                  ? "No tienes conversaciones archivadas"
                  : "No se encontraron conversaciones"}
              </p>
            </div>
          ) : (
            <ul>
              {filteredConversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <li key={c.id} className="relative group">
                    <button
                      onClick={() => openConversation(c.id)}
                      className={`w-full flex items-center px-5 py-3.5 text-left transition-colors ${
                        isActive
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {c.other_avatar_url ? (
                          <img
                            src={c.other_avatar_url}
                            alt={c.other_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center text-white font-bold text-base">
                            {c.other_name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3
                            className={`text-[14px] truncate pr-2 ${
                              c.unread_count > 0
                                ? "font-bold text-gray-900"
                                : "font-semibold text-gray-800"
                            }`}
                          >
                            {c.other_name}
                          </h3>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap font-medium">
                            {c.last_message_time &&
                              formatDistanceToNow(
                                new Date(c.last_message_time),
                                { addSuffix: false, locale: es }
                              )}
                          </span>
                        </div>
                        <p
                          className={`text-[13px] truncate pr-6 ${
                            c.unread_count > 0
                              ? "text-gray-900 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          {c.last_message_is_mine && (
                            <span className="text-gray-400">Tú: </span>
                          )}
                          {c.last_message_text || "Sin mensajes"}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {c.unread_count > 0 && (
                        <div className="ml-2 flex-shrink-0">
                          <span className="block w-2.5 h-2.5 rounded-full bg-[#875B9A]" />
                        </div>
                      )}
                    </button>

                    {/* Dropdown trigger */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenDropdownId(
                            openDropdownId === c.id ? null : c.id
                          );
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dropdown menu */}
                    {openDropdownId === c.id && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 z-20 py-1">
                        <button
                          onClick={(e) => handleArchiveToggle(e, c)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          {c.is_archived ? (
                            <>
                              <ArchiveRestore className="w-4 h-4 text-gray-400" />
                              Desarchivar
                            </>
                          ) : (
                            <>
                              <Archive className="w-4 h-4 text-gray-400" />
                              Archivar
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, c.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar chat
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ═══════════════════ RIGHT CHAT PANEL ═══════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          activeConversationId ? "flex" : "hidden md:flex"
        }`}
      >
        {!activeConversationId ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center mb-5">
              <Send className="w-8 h-8 text-gray-300 -rotate-45" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Tus mensajes
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Selecciona una conversación de la lista para empezar a chatear con
              proveedores o clientes.
            </p>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="flex items-center px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
              {/* Mobile back */}
              <button
                onClick={() => setActiveConversationId(null)}
                className="md:hidden p-1.5 -ml-1 mr-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Avatar */}
              {activeConversation?.other_avatar_url ? (
                <img
                  src={activeConversation.other_avatar_url}
                  alt={activeConversation.other_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#875B9A] to-[#6a437a] flex items-center justify-center text-white font-bold text-sm">
                  {activeConversation?.other_name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}

              <div className="ml-3 flex-1 min-w-0">
                <h2 className="text-[15px] font-bold text-gray-900 truncate">
                  {activeConversation?.other_name || "Chat"}
                </h2>
                {isTyping ? (
                  <p className="text-xs text-[#875B9A] font-medium animate-pulse">
                    Escribiendo...
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 font-medium">
                    ArtRider
                  </p>
                )}
              </div>
            </div>

            {/* ── About Item Banner ── */}
            {aboutItem && (
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-2.5 flex items-center gap-3 shrink-0">
                {aboutItem.cover_image_url && (
                  <img
                    src={aboutItem.cover_image_url}
                    alt={aboutItem.title || "Item"}
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {aboutItem.title}
                  </h3>
                  {aboutItem.daily_price > 0 && (
                    <p className="text-xs text-gray-500">
                      ${aboutItem.daily_price}/día
                    </p>
                  )}
                </div>
                <Info className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            )}

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {isLoadingChat ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-gray-400">
                    Envía el primer mensaje para iniciar la conversación
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const showDate = renderMessageDateSeparator(
                    msg,
                    messages[index - 1]
                  );
                  const isMine = msg.sender_id === currentUserId;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-3">
                          <div className="bg-white text-gray-500 text-[11px] py-1 px-3 rounded-full shadow-sm border border-gray-100 font-medium">
                            {format(
                              new Date(msg.sent_at),
                              "dd 'de' MMMM, yyyy",
                              { locale: es }
                            )}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`relative max-w-[70%] px-3.5 py-2 rounded-2xl text-[14px] ${
                            isMine
                              ? "bg-[#875B9A] text-white rounded-br-md"
                              : "bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={`flex justify-end items-center mt-0.5 gap-1 ${
                              isMine ? "text-white/60" : "text-gray-400"
                            }`}
                          >
                            <span className="text-[10px]">
                              {formatMessageTime(msg.sent_at)}
                            </span>
                            {isMine &&
                              (msg.read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              ))}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="px-5 py-3 bg-white border-t border-gray-200 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Enviar mensaje..."
                  className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#875B9A]/40 focus:border-[#875B9A] focus:bg-white transition-all"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
                    newMessage.trim() && !isSending
                      ? "bg-[#875B9A] text-white hover:bg-[#6a437a] shadow-sm"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
