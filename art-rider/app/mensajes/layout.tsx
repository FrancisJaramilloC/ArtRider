import { Metadata } from "next";

export const metadata: Metadata = { title: "Mensajes | ArtRider" };

export default function MensajesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
