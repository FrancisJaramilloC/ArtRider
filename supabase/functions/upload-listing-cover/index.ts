// Supabase Edge Function: upload-listing-cover
// Sube la foto de portada de un anuncio del lado del servidor (con la key
// de servicio) en vez de directo desde el cliente — evita depender de que
// el SDK de Storage de React Native arme la petición multipart/RLS
// perfectamente, que resultó ser poco confiable en pruebas reales.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Faltan datos de la imagen' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente identificado como el usuario, solo para confirmar que
    // de verdad es proveedor — el upload en sí usa la key de servicio.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: provider, error: providerError } = await userClient
      .from('providers')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return new Response(JSON.stringify({ error: 'No eres proveedor' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bytes = base64ToUint8Array(imageBase64);
    if (bytes.byteLength > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'La foto no puede superar los 5MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = `${provider.id}-${Date.now()}.${ext}`;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: uploadError } = await adminClient.storage
      .from('listing-covers')
      .upload(fileName, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'No se pudo subir la foto: ' + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: publicUrlData } = adminClient.storage.from('listing-covers').getPublicUrl(fileName);

    return new Response(JSON.stringify({ success: true, url: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Error procesando la imagen: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});