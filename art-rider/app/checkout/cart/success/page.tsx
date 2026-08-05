import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function CartSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/bookings");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: order }, { count: bookingCount }] = await Promise.all([
    supabase
      .from("checkout_orders")
      .select("id, total_price, start_date, end_date")
      .eq("id", orderId)
      .eq("client_id", user.id)
      .single(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("checkout_order_id", orderId)
      .eq("client_id", user.id),
  ]);
  if (!order) redirect("/bookings");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar initialUser={user} />
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago completado</h1>
        <p className="text-gray-600 mb-2">
          Se crearon {bookingCount ?? 0} reserva(s), una por cada proveedor involucrado.
        </p>
        <p className="text-gray-500 mb-8">
          Total: ${(order.total_price / 100).toFixed(2)} · {order.start_date} — {order.end_date}
        </p>
        <Link href="/bookings" className="inline-flex px-6 py-3 rounded-xl bg-black text-white font-semibold">
          Ver mis reservas
        </Link>
      </main>
    </div>
  );
}
