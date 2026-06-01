import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mensajes | ArtRider",
  description: "Mensajes privados con otros usuarios de ArtRider.",
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {children}
    </div>
  );
}
