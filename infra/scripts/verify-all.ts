/* eslint-env node */

import process from 'node:process';

function mask(value: string | undefined, visible = 4): string {
  if (!value) return 'undefined';
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webappUrl = process.env.WEBAPP_URL;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const bscRpcUrl = process.env.BSC_RPC_URL;
const tronApiUrl = process.env.TRON_API_URL;

const headers: Record<string, string> = {};
if (serviceKey) {
  headers['apikey'] = serviceKey;
  headers['Authorization'] = `Bearer ${serviceKey}`;
}

async function checkFunction(path: string): Promise<boolean> {
  if (!supabaseUrl) {
    console.error(`❌ SUPABASE_URL missing; cannot call ${path}`);
    return false;
  }
  try {
    const url = `${supabaseUrl}/functions/v1/${path}`;
    const res = await fetch(url, { headers });
    console.log(`GET ${url} -> ${res.status}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return true;
  } catch (err) {
    console.error(`❌ ${path} check failed:`, err);
    return false;
  }
}

async function checkDb(): Promise<boolean> {
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL missing; cannot check db health');
    return false;
  }
  try {
    const url = `${supabaseUrl}/functions/v1/admin-tools/db-health`;
    const res = await fetch(url, { headers });
    console.log(`GET ${url} -> ${res.status}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const tableSource: unknown = data?.tables ?? data;
    const tableNames = Array.isArray(tableSource)
      ? tableSource
      : Object.keys(tableSource || {});
    const required = ['messages', 'ea_reports'];
    const missing = required.filter((t) => !tableNames.includes(t));
    if (missing.length) {
      throw new Error(`Missing tables: ${missing.join(', ')}`);
    }
    console.log('✅ admin-tools/db-health tables present');
    return true;
  } catch (err) {
    console.error('❌ admin-tools/db-health failed:', err);
    return false;
  }
}

async function checkWebapp(): Promise<boolean> {
  if (!webappUrl) {
    console.error('❌ WEBAPP_URL missing');
    return false;
  }
  try {
    let res = await fetch(webappUrl, { method: 'HEAD' });
    if (res.status < 200 || res.status >= 400) {
      res = await fetch(webappUrl);
    }
    console.log(`WEBAPP_URL ${webappUrl} -> ${res.status}`);
    if (res.status < 200 || res.status >= 400) {
      throw new Error(`Status ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error('❌ WEBAPP_URL check failed:', err);
    return false;
  }
}

async function checkTelegram(): Promise<boolean> {
  if (!telegramToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN missing');
    return false;
  }
  try {
    const base = `https://api.telegram.org/bot${telegramToken}`;
    const masked = `https://api.telegram.org/bot${mask(telegramToken)}`;

    const meRes = await fetch(`${base}/getMe`);
    console.log(`GET ${masked}/getMe -> ${meRes.status}`);
    const me = await meRes.json().catch(() => ({}));
    if (!me.ok) throw new Error('getMe failed');

    const infoRes = await fetch(`${base}/getWebhookInfo`);
    console.log(`GET ${masked}/getWebhookInfo -> ${infoRes.status}`);
    const info = await infoRes.json().catch(() => ({}));
    if (!info.ok) throw new Error('getWebhookInfo failed');
    const webhookUrl: string | undefined = info.result?.url;
    const expected = supabaseUrl
      ? `${supabaseUrl}/functions/v1/telegram-webhook`
      : undefined;
    if (expected && webhookUrl !== expected) {
      throw new Error(`Webhook mismatch: ${webhookUrl} !== ${expected}`);
    }
    console.log('✅ Telegram webhook URL matches');
    return true;
  } catch (err) {
    console.error('❌ Telegram check failed:', err);
    return false;
  }
}

async function checkBsc(): Promise<void> {
  if (!bscRpcUrl) {
    console.log('ℹ️ BSC_RPC_URL not set; skipping');
    return;
  }
  try {
    const res = await fetch(bscRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
    });
    const data = await res.json().catch(() => ({}));
    const block = data.result ? parseInt(data.result, 16) : undefined;
    console.log(`BSC latest block: ${block ?? 'unknown'}`);
  } catch (err) {
    console.error('⚠️ BSC_RPC_URL check failed:', err);
  }
}

async function checkTron(): Promise<void> {
  if (!tronApiUrl) {
    console.log('ℹ️ TRON_API_URL not set; skipping');
    return;
  }
  try {
    const url = `${tronApiUrl.replace(/\/$/, '')}/wallet/getnowblock`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const block = data?.block_header?.raw_data?.number;
    console.log(`TRON latest block: ${block ?? 'unknown'}`);
  } catch (err) {
    console.error('⚠️ TRON_API_URL check failed:', err);
  }
}

async function main(): Promise<void> {
  const checks = [
    checkFunction('telegram-webhook'),
    checkFunction('ea-report'),
    checkFunction('bank-inbox?dryRun=1'),
    checkFunction('crypto-watcher?dryRun=1'),
    checkFunction('admin-tools?dryRun=1'),
    checkDb(),
    checkWebapp(),
    checkTelegram(),
  ];

  const results = await Promise.all(checks);
  await Promise.all([checkBsc(), checkTron()]);

  if (results.some((ok) => !ok)) {
    process.exitCode = 1;
  } else {
    console.log('✅ All required checks passed');
  }
}

await main();
