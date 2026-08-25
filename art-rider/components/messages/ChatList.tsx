"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MoreVertical, Search, Archive, Trash2, ArchiveRestore } from "lucide-react";
import { 
  ConversationSummary, 
  archiveConversation, 
  unarchiveConversation, 
  deleteConversationForMe 
} from "@/services/messagesService";
import { subscribeToConversationUpdates } from "@/services/messagesRealtime";

interface ChatListProps {
  initialConversations: ConversationSummary[];
  baseUrl: string;
  refetchConversations: () => Promise<ConversationSummary[]>;
  currentUserId: string;
}

export function ChatList({ initialConversations, baseUrl, refetchConversations, currentUserId }: ChatListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [tab, setTab] = useState<"todos" | "archivados">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle outside click for dropdown
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Re-sync if props change
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (!currentUserId) return;
    
    // Subscribe to updates (e.g. new message arrives, read status changes)
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
  }, [currentUserId, refetchConversations]);

  const handleArchiveToggle = async (e: React.MouseEvent, conversation: ConversationSummary) => {
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

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta conversación?")) return;
    
    try {
      await deleteConversationForMe(conversationId);
      const updated = await refetchConversations();
      setConversations(updated);
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
    setOpenDropdownId(null);
  };

  const filteredConversations = conversations.filter(c => {
    const matchesTab = tab === "archivados" ? c.is_archived : !c.is_archived;
    const matchesSearch = (c.other_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Mensajes</h2>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setTab("todos")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "todos" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTab("archivados")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "archivados" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
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
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" ref={dropdownRef}>
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron conversaciones.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredConversations.map(c => (
              <li key={c.id} className="relative group">
                <Link
                  href={`${baseUrl}/${c.id}`}
                  className="flex items-start p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {c.other_avatar_url ? (
                      <img
                        src={c.other_avatar_url}
                        alt={c.other_name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                        {c.other_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    {c.unread_count > 0 && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                        {c.other_name}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {c.last_message_time && formatDistanceToNow(new Date(c.last_message_time), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className={`text-sm truncate pr-6 ${c.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {c.last_message_text || "Sin mensajes"}
                    </p>
                  </div>
                </Link>

                {/* Dropdown Menu Toggle */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenDropdownId(openDropdownId === c.id ? null : c.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {openDropdownId === c.id && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 py-1">
                    <button
                      onClick={(e) => handleArchiveToggle(e, c)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      {c.is_archived ? (
                        <><ArchiveRestore className="w-4 h-4 mr-2 text-gray-500" /> Desarchivar</>
                      ) : (
                        <><Archive className="w-4 h-4 mr-2 text-gray-500" /> Archivar</>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, c.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Eliminar chat
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
