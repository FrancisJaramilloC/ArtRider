// Cliente de Supabase para el navegador

import { createBrowserClient } from '@supabase/ssr'

// Función que crea el cliente de Supabase
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
