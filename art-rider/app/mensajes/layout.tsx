import { Metadata } from "next";

export const metadata: Metadata = { title: "Mensajes | ArtRider" };

export default function MensajesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">{children}</div>
  );
}
