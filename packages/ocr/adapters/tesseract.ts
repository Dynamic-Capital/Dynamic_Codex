// BEGIN TESSERACT_ADAPTER
import { OcrVendor } from '../types';

const timeoutMs = 30_000;
const maxRetries = 0;

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Node.js fallback
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

async function recognize(base64: string): Promise<string> {
  // Using `any` because tesseract.js types are unavailable without installing the package.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('tesseract.js');
  const worker = await mod.createWorker();
  try {
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data } = await worker.recognize(base64ToUint8Array(base64));
    return data.text as string;
  } finally {
    await worker.terminate();
  }
}

export const tesseract: OcrVendor = {
  name: 'tesseract',
  timeoutMs,
  maxRetries,
  usdPerImage: 0,
  recognize,
};

export default tesseract;
// END TESSERACT_ADAPTER
