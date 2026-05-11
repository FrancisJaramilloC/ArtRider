import { supabase } from "@/lib/supabase";
import MapWrapper from "./MapWrapper";

export const metadata = {
  title: "Cerca de ti | ArtRider",
  description: "Encuentra equipos y paquetes cerca de tu ubicación.",
};

export default async function MapPage() {

  // Obtenemos los equipos publicados con sus direcciones
  const { data: listings } = await supabase
    .from("listings")
    .select(`
      *,
      address:addresses(latitude, longitude, city, state)
    `)
    .eq("is_published", true)
    .not("address_id", "is", null);

  // TODO: Una vez que packages tenga address_id, se pueden hacer queries similares
  // para los paquetes y mandarlos juntos. Por ahora mandamos solo equipos.

  return <MapWrapper initialListings={listings || []} />;
}
