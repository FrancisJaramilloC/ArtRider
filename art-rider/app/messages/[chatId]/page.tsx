/*
 * Ruta proxy para /dashboard/messages/:chatId
 * Mantiene el mismo layout y funcionalidad que /messages/:chatId
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";

// Metadata de la pagina
export const metadata: Metadata = {
  title: "Chat | ArtRider",
  description: "Mensajes privados con otros usuarios de ArtRider.",
};

// Componente de la pagina de chat
export default function ChatRoomPage({ params }: { params: { chatId: string } }) {
  redirect(`/messages/${params.chatId}`);
}