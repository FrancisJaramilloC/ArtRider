// Destino del enlace de confirmación de correo: canjea ?code= por una sesión (PKCE) y redirige.

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getSiteUrl } from '@/lib/siteUrl';

/** Solo rutas internas: evita redirecciones abiertas (`//otro-sitio`, `https://…`). */
function safeNextPath(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const siteUrl = await getSiteUrl();
  const failure = NextResponse.redirect(`${siteUrl}/login?error=confirm_failed`);

  // Supabase devuelve ?error= cuando el enlace está vencido o ya se usó.
  if (!code || searchParams.get('error')) return failure;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure;
  } catch (error) {
    console.error('Error al canjear el código de confirmación:', error);
    return failure;
  }

  return NextResponse.redirect(`${siteUrl}${next}`);
}
