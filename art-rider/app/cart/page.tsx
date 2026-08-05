import Navbar from "@/components/layout/Navbar";
import CartPageClient from "@/components/cart/CartPageClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata = {
  title: "Carrito | ArtRider",
  description: "Reserva equipos de varios proveedores con un solo pago.",
};

export default async function CartPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar initialUser={user} />
      <CartPageClient isAuthenticated={Boolean(user)} />
    </div>
  );
}
