// BEGIN CONFIG-HUB
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Sign',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

async function hmacValid(sign: string | null, body: string, secret: string): Promise<boolean> {
  if (!sign) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const bodyData = encoder.encode(body);
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then(key => crypto.subtle.sign('HMAC', key, bodyData))
    .then(sig => btoa(String.fromCharCode(...new Uint8Array(sig))))
    .then(b64 => b64 === sign)
    .catch(() => false);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(req.url);
  if (url.searchParams.get('health') === '1') {
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return new Response('missing config', { status: 500, headers: cors });
  }
  const client = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    const etag = req.headers.get('if-none-match');
    const { data, error } = await client.rpc('get_app_config');
    if (error) return new Response(error.message, { status: 500, headers: cors });
    if (etag && etag === data.version) {
      return new Response(null, { status: 304, headers: { ...cors, 'ETag': data.version } });
    }
    return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json', 'ETag': data.version } });
  }

  if (req.method === 'POST') {
    const secret = Deno.env.get('CHATOPS_SIGNING_SECRET') || '';
    const body = await req.text();
    const sign = req.headers.get('x-admin-sign');
    if (!secret || !(await hmacValid(sign, body, secret))) {
      return new Response('unauthorized', { status: 401, headers: cors });
    }
    const { key, value } = JSON.parse(body);
    const { error } = await client.from('app_config').upsert({ key, value });
    if (error) return new Response(error.message, { status: 500, headers: cors });
    const { data } = await client.rpc('get_app_config');
    return new Response(JSON.stringify({ version: data.version }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
});
// END CONFIG-HUB
