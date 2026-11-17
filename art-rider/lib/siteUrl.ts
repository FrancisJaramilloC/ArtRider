// URL base pública del sitio, usada para los enlaces de los correos de Supabase (emailRedirectTo).
// Se define con NEXT_PUBLIC_SITE_URL (sin dominio hardcodeado); si falta, se deduce de la petición.

import { headers } from 'next/headers';

export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    if (!/^https?:\/\/[^\s/]+/.test(configured)) {
      throw new Error('NEXT_PUBLIC_SITE_URL debe empezar con http:// o https://');
    }
    return configured.replace(/\/+$/, '');
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) {
    throw new Error('No se pudo determinar la URL del sitio. Define NEXT_PUBLIC_SITE_URL.');
  }
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (isLocal ? 'http' : 'https');
  return `${protocol}://${host}`;
}

/** URL a la que Supabase redirige tras confirmar el correo. */
export async function getAuthCallbackUrl(): Promise<string> {
  return `${await getSiteUrl()}/auth/callback`;
}
