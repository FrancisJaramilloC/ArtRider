import { redirect } from "next/navigation";

// Individual chat pages now redirect to the unified panel.
// The MessagesPanel component handles opening conversations inline.
export default async function MensajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect("/mensajes");
}
