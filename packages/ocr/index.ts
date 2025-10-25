// BEGIN OCR_ABSTRACTION
import { OcrResult, OcrVendor } from './types.ts';

const cache = new Map<string, OcrResult>();

const vendorFactories: Record<string, () => OcrVendor> = {
  none: () => ({
    async run(): Promise<OcrResult> {
      throw new Error('OCR provider not configured');
    },
  }),
};

function getEnv(name: string): string | undefined {
  if (typeof Deno !== 'undefined' && typeof Deno.env?.get === 'function') {
    return Deno.env.get(name);
  }
  return process.env[name];
}

function createVendor(): OcrVendor {
  const provider = getEnv('OCR_PROVIDER') || 'none';
  const factory = vendorFactories[provider];
  if (!factory) {
    throw new Error(`Unsupported OCR provider: ${provider}`);
  }
  return factory();
}

function cacheKey(input: unknown, opts: Record<string, unknown>): string {
  const base = typeof input === 'string' ? input : JSON.stringify(input);
  return JSON.stringify({ base, opts });
}

export async function runOCR(
  input: unknown,
  opts: Record<string, unknown> = {},
): Promise<OcrResult> {
  const key = cacheKey(input, opts);
  const cached = cache.get(key);
  if (cached) return cached;
  const vendor = createVendor();
  const result = await vendor.run(input, opts);
  cache.set(key, result);
  return result;
}
// END OCR_ABSTRACTION
