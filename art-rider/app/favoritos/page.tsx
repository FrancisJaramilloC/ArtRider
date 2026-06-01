import { getFavoritosEquipos, getFavoritosPaquetes } from "@/services/favoritosService";
import FavoritosClient from "./FavoritosClient";

export default async function FavoritosPage() {
  const [equipos, paquetes] = await Promise.all([
    getFavoritosEquipos(),
    getFavoritosPaquetes(),
  ]);

  return <FavoritosClient equipos={equipos} paquetes={paquetes} />;
}
