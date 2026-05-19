// NOTA: Cliente genérico de Supabase solo para acciones de lectura pública.
// Este cliente no tiene contexto de cookies SSR y depende exclusivamente de credenciales anónimas.
import { createClient } from '@supabase/supabase-js';

// URL y clave de API de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Crea el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
