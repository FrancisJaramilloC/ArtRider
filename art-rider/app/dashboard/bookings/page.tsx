// Importar la funcion de redireccion
import { redirect } from "next/navigation";

// Componente que redirige a la pagina principal de reservas
export default function RedirectBookings() {
  redirect("/bookings");
}
