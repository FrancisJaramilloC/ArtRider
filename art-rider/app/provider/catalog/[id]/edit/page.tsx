import { updateListing } from "@/services/listingsService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import EditListingClient from "@/app/provider/catalog/[id]/edit/EditListingClient";
import { getMyProviderId } from "@/services/helpers/getMyProviderId";

//  Página principal de edición de listado
export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const providerId = await getMyProviderId();

  //  Si no se encuentra el proveedor, redirigir a la página de error
  if (!providerId) notFound();

  //  Crear cliente de Supabase en el servidor
  const supabase = await createSupabaseServerClient();

  //  Obtener listado incluyendo no publicados — solo el propietario puede editar sus borradores.
  //  Unir direcciones para pre-rellenar los campos de ubicación en el formulario.
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*, address:addresses(city, state, latitude, longitude)")
    .eq("id", id)
    .eq("provider_id", providerId)
    .is("deleted_at", null)
    .single();

  //  Si no se encuentra el listado, redirigir a la página de error
  if (error || !listing) notFound();

  //  Función para actualizar el listado
  const boundUpdate = updateListing.bind(null, id);

  return <EditListingClient listing={listing} updateAction={boundUpdate} />;
}
