// BEGIN OCR_PROVIDER_SELECTOR
import { OcrVendor } from './types';
import vision from './adapters/vision';
import ocrspace from './adapters/ocrspace';
import tesseract from './adapters/tesseract';

const vendors: Record<string, OcrVendor> = {
  vision,
  ocrspace,
  tesseract,
};

function getEnv(key: string): string | undefined {
  // Support both Node.js and Deno environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = typeof Deno !== 'undefined' ? Deno.env : process.env;
  return env?.get ? env.get(key) : env?.[key];
}

const providerName = getEnv('OCR_PROVIDER')?.toLowerCase();
export const ocr: OcrVendor =
  providerName && vendors[providerName] ? vendors[providerName] : tesseract;

export default ocr;
// END OCR_PROVIDER_SELECTOR
