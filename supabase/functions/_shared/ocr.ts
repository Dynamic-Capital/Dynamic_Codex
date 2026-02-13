// BEGIN OCRSPACE_CONFIG
export interface OcrProviderConfig {
  provider: 'ocrspace' | 'vision' | 'tesseract';
  apiKey?: string;
  minConfidence: number;
  allowedMime: string[];
  maxPages: number;
}

export const ocrConfig: OcrProviderConfig = {
  provider: (Deno.env.get('OCR_PROVIDER') as OcrProviderConfig['provider']) ?? 'ocrspace',
  apiKey: Deno.env.get('OCR_API_KEY'),
  minConfidence: Number(Deno.env.get('OCR_MIN_CONFIDENCE') ?? '0.8'),
  allowedMime: JSON.parse(
    Deno.env.get('OCR_ALLOWED_MIME') ?? '["image/jpeg","image/png","application/pdf"]'
  ) as string[],
  maxPages: Number(Deno.env.get('OCR_MAX_PAGES') ?? '3'),
};
// END OCRSPACE_CONFIG
