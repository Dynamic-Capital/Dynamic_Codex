// BEGIN OCRSPACE_ADAPTER
import { OcrVendor } from '../types';

const API_URL = 'https://api.ocr.space/parse/image';
const timeoutMs = 20_000;
const maxRetries = 3;

function getEnv(key: string): string | undefined {
  // Support both Node.js and Deno environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = typeof Deno !== 'undefined' ? Deno.env : process.env;
  return env?.get ? env.get(key) : env?.[key];
}

async function callApi(base64: string): Promise<string> {
  const apiKey = getEnv('OCRSPACE_API_KEY');
  if (!apiKey) throw new Error('Missing OCRSPACE_API_KEY');
  const form = new FormData();
  form.append('base64Image', `data:image/png;base64,${base64}`);
  form.append('language', 'eng');
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { apikey: apiKey },
      body: form,
      signal: controller.signal,
    });
    const json = await res.json();
    return json.ParsedResults?.[0]?.ParsedText ?? '';
  } finally {
    clearTimeout(id);
  }
}

async function recognize(base64: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callApi(base64);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export const ocrspace: OcrVendor = {
  name: 'ocrspace',
  timeoutMs,
  maxRetries,
  usdPerImage: 0.0005,
  recognize,
};

export default ocrspace;
// END OCRSPACE_ADAPTER
