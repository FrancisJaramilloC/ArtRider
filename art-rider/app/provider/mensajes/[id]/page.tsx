import { redirect } from "next/navigation";

// Individual chat pages now redirect to the unified panel.
export default async function ProviderMensajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect("/provider/mensajes");
}
