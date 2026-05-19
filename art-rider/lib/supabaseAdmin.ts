//  Cliente genérico de Supabase para el navegador
import { createClient } from '@supabase/supabase-js';

// NOTA: Cliente genérico de Supabase solo para acciones de lectura pública.
// IMPORTANTE: Este cliente se conecta usando la Service Role Key.
// Omite todas las políticas de seguridad a nivel de fila (RLS).
// NUNCA expongas este cliente al navegador ni lo uses para operaciones estándar de usuarios.
// POR QUÉ: Requerimos un pipeline de base de datos directo exclusivamente para insertar tablas de `profiles` estrictamente bloqueadas
// que normalmente rechazan entradas no autenticadas. Esto actúa como un ejecutor sudo protegido.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Función que crea el cliente de Supabase
  if (!url) {
    throw new Error('Supabase URL is missing from environment variables.');
  }

  // Función que crea el cliente de Supabase
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables. Do not expose this key to clients.');
  }

  // Crea el cliente de Supabase
  return createClient(
    url as string,
    serviceKey as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
