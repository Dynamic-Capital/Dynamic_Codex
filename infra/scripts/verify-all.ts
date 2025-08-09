import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

interface CheckResult {
  name: string;
  ok: boolean;
  message?: string;
}

const results: CheckResult[] = [];

function addResult(name: string, ok: boolean, message?: string) {
  results.push({ name, ok, message });
}

const {
  SUPABASE_URL,
  WEBAPP_URL,
  TELEGRAM_BOT_TOKEN,
  VIP_CHAT_ID,
  BSC_RPC_URL,
  TRON_API_URL,
} = process.env;

if (!SUPABASE_URL) addResult('SUPABASE_URL env', false, 'Missing SUPABASE_URL');
if (!WEBAPP_URL) addResult('WEBAPP_URL env', false, 'Missing WEBAPP_URL');
if (!TELEGRAM_BOT_TOKEN) addResult('TELEGRAM_BOT_TOKEN env', false, 'Missing TELEGRAM_BOT_TOKEN');
if (!VIP_CHAT_ID) addResult('VIP_CHAT_ID env', false, 'Missing VIP_CHAT_ID');

async function checkFunctionHealth() {
  if (!SUPABASE_URL) return;
  const dir = resolve(__dirname, '../../supabase/functions');
  let names: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    addResult('functions directory', false, 'supabase/functions missing');
    return;
  }
  for (const name of names) {
    const url = `${SUPABASE_URL}/functions/v1/${name}/health`;
    try {
      const res = await fetch(url);
      addResult(`${name} health`, res.ok && res.status >= 200 && res.status < 400, `Status ${res.status}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addResult(`${name} health`, false, message);
    }
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/db-health`);
    addResult('db-health', res.ok && res.status >= 200 && res.status < 400, `Status ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('db-health', false, message);
  }
}

async function checkWebapp() {
  if (!WEBAPP_URL) return;
  try {
    let res = await fetch(WEBAPP_URL, { method: 'HEAD' });
    if (!res.ok && res.status === 405) {
      res = await fetch(WEBAPP_URL);
    }
    addResult('Mini App reachable', res.ok && res.status >= 200 && res.status < 400, `Status ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('Mini App reachable', false, message);
  }
}

async function checkTelegram() {
  if (!TELEGRAM_BOT_TOKEN) return;
  const base = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  try {
    const res = await fetch(`${base}/getMe`);
    const data = await res.json();
    addResult('Telegram getMe', res.ok && data.ok, data.ok ? `@${data.result.username}` : data.description || `Status ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('Telegram getMe', false, message);
  }
  try {
    if (!SUPABASE_URL) {
      addResult('Telegram webhook URL', false, 'SUPABASE_URL not set');
      return;
    }
    const res = await fetch(`${base}/getWebhookInfo`);
    const data = await res.json();
    const expected = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
    const matches = res.ok && data.ok && data.result?.url === expected;
    addResult(
      'Telegram webhook URL',
      matches,
      res.ok ? (data.result?.url || 'No webhook set') : data.description || `Status ${res.status}`,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('Telegram webhook URL', false, message);
  }
}

async function checkBsc() {
  if (!BSC_RPC_URL) {
    addResult('BSC RPC', true, 'Skipped');
    return;
  }
  try {
    const res = await fetch(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });
    addResult('BSC RPC', res.ok, `Status ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('BSC RPC', false, message);
  }
}

async function checkTron() {
  if (!TRON_API_URL) {
    addResult('TRON RPC', true, 'Skipped');
    return;
  }
  try {
    const url = `${TRON_API_URL.replace(/\/$/, '')}/wallet/getnowblock`;
    const res = await fetch(url, { method: 'POST' });
    addResult('TRON RPC', res.ok, `Status ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    addResult('TRON RPC', false, message);
  }
}

await checkFunctionHealth();
await checkWebapp();
await checkTelegram();
await checkBsc();
await checkTron();

console.table(
  results.map((r) => ({ Check: r.name, Status: r.ok ? '✅' : '❌', Detail: r.message ?? '' })),
);

process.exit(results.every((r) => r.ok) ? 0 : 1);
