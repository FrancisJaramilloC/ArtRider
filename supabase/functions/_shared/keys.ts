// Llaves de Supabase para las Edge Functions.
// Prefiere las llaves nuevas (SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS, JSON {nombre: llave})
// y cae a las legacy (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY) para poder rotar sin cortar el servicio.
// Las llaves nuevas (sb_secret_... / sb_publishable_...) NO son JWT: no las decodifiques ni las uses como Bearer
// hacia tu propio código; solo pásalas a createClient().

type EnvGetter = (name: string) => string | undefined;

const defaultGetEnv: EnvGetter = (name) => Deno.env.get(name);

function fromKeyMap(raw: string | undefined, envName: string): string | undefined {
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${envName} no es un JSON válido`);
  }
  const value = (parsed as Record<string, unknown> | null)?.['default'];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resolveKey(getEnv: EnvGetter, newName: string, legacyName: string): string {
  const key = fromKeyMap(getEnv(newName), newName) ?? getEnv(legacyName);
  if (!key) {
    throw new Error(`Falta la llave de Supabase: define ${newName} (clave "default") o ${legacyName}`);
  }
  return key;
}

/** Llave de servicio (saltea RLS). Solo servidor. */
export function getServiceKey(getEnv: EnvGetter = defaultGetEnv): string {
  return resolveKey(getEnv, 'SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
}

/** Llave publicable/anon. */
export function getPublishableKey(getEnv: EnvGetter = defaultGetEnv): string {
  return resolveKey(getEnv, 'SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
}
