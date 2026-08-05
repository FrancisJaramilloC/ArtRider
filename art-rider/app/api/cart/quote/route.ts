import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { buildCartQuote } from "@/services/cartCheckoutService";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const quote = await buildCartQuote(payload, user?.id);
    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cotizar el carrito." },
      { status: 400 },
    );
  }
}
