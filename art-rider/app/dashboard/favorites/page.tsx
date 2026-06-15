import { redirect } from "next/navigation";

// Componente que redirige a la pagina principal de favoritos
export default function RedirectFavoritos() {
  redirect("/favoritos");
}
