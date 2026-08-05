import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import CartCheckoutClient from "@/components/cart/CartCheckoutClient";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata = {
  title: "Pago del carrito | ArtRider",
  description: "Pago único Kushki para una orden con varios proveedores.",
};

export default async function CartCheckoutPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/checkout/cart");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar initialUser={user} />
      <CartCheckoutClient />
    </div>
  );
}
