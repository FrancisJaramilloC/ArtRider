// Cliente de Supabase para el servidor

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

//  Validar la autorización a nivel de Edge/Servidor garantiza que los navegadores maliciosos no puedan falsificar tokens de forma nativa.
//  Emparejamos estrictamente este mapeo con las cookies de `next/headers` que permiten una interoperabilidad completa de la sesión.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  // Función que crea el cliente de Supabase
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      // Cookies 
      cookies: {
        // Obtiene el valor de la cookie
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        //  Settea el valor de la cookie
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            //  El método `set` fue llamado desde un componente del servidor.
            //  Esto se puede ignorar si tienes middleware actualizando las sesiones de usuario.
          }
        },
        //  Elimina el valor de la cookie
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            //  El método `delete` fue llamado desde un componente del servidor.
            //  Esto se puede ignorar si tienes middleware actualizando las sesiones de usuario.
          }
        },
      },
    }
  );
}

