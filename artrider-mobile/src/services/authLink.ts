/** Datos que Supabase puede devolver en el enlace de confirmación (query `?code=` con PKCE, o `#access_token=` implícito). */
export interface AuthLinkParams {
    code?: string;
    tokenHash?: string;
    type?: string;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
}

function parsePairs(raw: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!raw) return out;
    for (const pair of raw.split('&')) {
        if (!pair) continue;
        const [key, ...rest] = pair.split('=');
        try {
            out[decodeURIComponent(key)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
        } catch {
            // Parámetro mal codificado: se ignora.
        }
    }
    return out;
}

/** Extrae los parámetros de autenticación de una URL (query y fragmento). Nunca lanza. */
export function parseAuthLink(url: string | null | undefined): AuthLinkParams {
    if (!url) return {};
    const hashIndex = url.indexOf('#');
    const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
    const queryIndex = beforeHash.indexOf('?');
    const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);

    const all = { ...parsePairs(query), ...parsePairs(hash) };
    return {
        code: all.code,
        tokenHash: all.token_hash,
        type: all.type,
        accessToken: all.access_token,
        refreshToken: all.refresh_token,
        error: all.error_description ?? all.error,
    };
}

export function hasAuthCredentials(params: AuthLinkParams): boolean {
    return !!(params.code || params.tokenHash || (params.accessToken && params.refreshToken) || params.error);
}
