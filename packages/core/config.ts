// BEGIN CONFIG-HUB
interface ConfigPayload {
  version: string;
  data: Record<string, unknown>;
}

let cache: (ConfigPayload & { fetchedAt: number }) | null = null;
const TTL_MS = 60_000;

export async function fetchConfig(): Promise<ConfigPayload> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return { version: cache.version, data: cache.data };
  }
  const baseUrl = Deno.env.get('SUPABASE_URL');
  if (!baseUrl) throw new Error('SUPABASE_URL not set');
  const init: RequestInit = {};
  if (cache?.version) {
    init.headers = { 'If-None-Match': cache.version };
  }
  const res = await fetch(`${baseUrl}/functions/v1/config-hub`, init);
  if (res.status === 304 && cache) {
    cache.fetchedAt = Date.now();
    return { version: cache.version, data: cache.data };
  }
  const json = await res.json();
  cache = { ...json, fetchedAt: Date.now() };
  return { version: json.version, data: json.data };
}

export async function get<T>(key: string, fallback?: T): Promise<T | undefined> {
  const cfg = await fetchConfig();
  return (cfg.data[key] as T) ?? fallback;
}

export function invalidateConfig() {
  cache = null;
}
// END CONFIG-HUB
