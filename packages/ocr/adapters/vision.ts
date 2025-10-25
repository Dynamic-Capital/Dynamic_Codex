// BEGIN VISION_ADAPTER
import { OcrVendor } from '../types';

const API_URL = 'https://vision.googleapis.com/v1/images:annotate';
const timeoutMs = 10_000;
const maxRetries = 2;

function getEnv(key: string): string | undefined {
  // Support both Node.js and Deno environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = typeof Deno !== 'undefined' ? Deno.env : process.env;
  return env?.get ? env.get(key) : env?.[key];
}

async function callApi(base64: string): Promise<string> {
  const apiKey = getEnv('GOOGLE_VISION_API_KEY');
  if (!apiKey) throw new Error('Missing GOOGLE_VISION_API_KEY');
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'TEXT_DETECTION' }],
      },
    ],
  };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json();
    return json.responses?.[0]?.fullTextAnnotation?.text ?? '';
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

export const vision: OcrVendor = {
  name: 'vision',
  timeoutMs,
  maxRetries,
  usdPerImage: 0.0015,
  recognize,
};

export default vision;
// END VISION_ADAPTER
