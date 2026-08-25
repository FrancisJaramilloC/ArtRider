"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, CheckCheck, Send, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Message, 
  sendMessage, 
  markMessagesRead, 
  ConversationAboutItem 
} from "@/services/messagesService";
import { 
  subscribeToMessages, 
  subscribeToPresence, 
  subscribeToTyping, 
  broadcastTyping 
} from "@/services/messagesRealtime";

interface ChatRoomProps {
  initialMessages: Message[];
  conversationId: string;
  currentUserId: string;
  aboutItem: ConversationAboutItem | null;
  otherParticipantName: string;
  otherParticipantId?: string; // Optional if needed for presence
}

export function ChatRoom({ 
  initialMessages, 
  conversationId, 
  currentUserId, 
  aboutItem, 
  otherParticipantName,
  otherParticipantId
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isNewConversation = conversationId === 'new';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Re-sync messages if conversation changes
    setMessages(initialMessages);
  }, [initialMessages, conversationId]);

  useEffect(() => {
    if (isNewConversation) return;

    // Mark as read immediately on mount and when conversation changes
    markMessagesRead(conversationId).catch(console.error);

    // Subscribe to new messages
    const channelMessages = subscribeToMessages(
      conversationId, 
      (incomingMsg) => {
        setMessages(prev => {
          if (prev.find(m => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        if (incomingMsg.sender_id !== currentUserId) {
          markMessagesRead(conversationId).catch(console.error);
        }
      },
      (updatedMsg) => {
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      }
    );

    // Subscribe to typing indicators
    const channelTyping = subscribeToTyping(conversationId, currentUserId, (isTyping) => {
      setIsTyping(isTyping);
    });

    // Subscribe to presence
    let channelPresence: any = undefined;
    if (otherParticipantId) {
      channelPresence = subscribeToPresence(conversationId, currentUserId, (onlineUsers) => {
        setIsOnline(onlineUsers.includes(otherParticipantId));
      });
    }

    return () => {
      channelMessages.unsubscribe();
      channelTyping.unsubscribe();
      if (channelPresence) channelPresence.unsubscribe();
    };
  }, [conversationId, currentUserId, isNewConversation, otherParticipantId]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (isNewConversation) return;

    broadcastTyping(conversationId, currentUserId, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(conversationId, currentUserId, false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    if (!isNewConversation) {
      broadcastTyping(conversationId, currentUserId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    try {
      // In a real app, you might want to optimistically add the message to the UI
      const tempId = `temp-${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content,
        sent_at: new Date().toISOString(),
        read: false
      };
      
      setMessages(prev => [...prev, tempMsg]);

      const sentMsg = await sendMessage(conversationId, content);
      
      // Replace optimistic message with the real one
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
    } catch (error) {
      console.error("Error sending message:", error);
      // Rollback optimistic update here if desired
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: es });
  };

  const renderMessageDateSeparator = (currentMsg: Message, previousMsg?: Message) => {
    if (!previousMsg) return true;
    const current = new Date(currentMsg.sent_at);
    const prev = new Date(previousMsg.sent_at);
    return current.toDateString() !== prev.toDateString();
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] lg:bg-gray-50 relative">
      {/* Background pattern similar to WhatsApp (optional) */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-repeat" />

      {/* Header */}
      <div className="relative z-10 flex items-center p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{otherParticipantName}</h2>
          {isTyping ? (
            <p className="text-xs text-indigo-500 font-medium animate-pulse">Escribiendo...</p>
          ) : isOnline ? (
            <p className="text-xs text-green-500 font-medium">En línea</p>
          ) : (
            <p className="text-xs text-gray-500">Desconectado</p>
          )}
        </div>
      </div>

      {/* About Item Banner */}
      {aboutItem && (
        <div className="relative z-10 bg-white border-b border-gray-200 p-3 flex items-center space-x-4">
          {aboutItem.cover_image_url && (
            <img 
              src={aboutItem.cover_image_url} 
              alt={aboutItem.title || "Item"} 
              className="w-12 h-12 object-cover rounded-md"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">{aboutItem.title}</h3>
            {aboutItem.daily_price && (
              <p className="text-sm text-gray-600">${aboutItem.daily_price}/día</p>
            )}
          </div>
          <button className="text-gray-400 hover:text-gray-600 p-2">
            <Info className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="relative z-10 flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => {
          const showDate = renderMessageDateSeparator(msg, messages[index - 1]);
          const isMine = msg.sender_id === currentUserId;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-4">
                  <div className="bg-white/80 backdrop-blur text-gray-500 text-xs py-1 px-3 rounded-full shadow-sm">
                    {format(new Date(msg.sent_at), "dd 'de' MMMM, yyyy", { locale: es })}
                  </div>
                </div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`relative max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                    isMine 
                      ? "bg-indigo-600 text-white rounded-br-sm" 
                      : "bg-white text-gray-900 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  
                  <div className={`flex justify-end items-center mt-1 space-x-1 ${
                    isMine ? "text-indigo-200" : "text-gray-400"
                  }`}>
                    <span className="text-[10px]">
                      {formatMessageTime(msg.sent_at)}
                    </span>
                    {isMine && (
                      msg.read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-10 p-3 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={isNewConversation ? "Escribe el primer mensaje..." : "Escribe un mensaje..."}
            className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
              newMessage.trim() && !isSending
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
