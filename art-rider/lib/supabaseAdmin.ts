import { createClient } from '@supabase/supabase-js';

// IMPORTANT: This client connects using the Service Role Key.
// It bypasses all Row Level Security (RLS) policies.
// NEVER expose this client to the browser or use it for standard user operations.
// WHY: We require a direct database pipeline exclusively for inserting strictly locked `profiles` tables
// that normally reject non-authenticated inputs. This acts as a protected sudo-executor.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Supabase URL is missing from environment variables.');
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables. Do not expose this key to clients.');
  }

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
