// BEGIN OCR_ABSTRACTION
export interface OcrResult {
  text: string;
  fields?: Record<string, string>;
  confidence: number;
  meta: Record<string, unknown>;
}

export interface OcrVendor {
  run(input: unknown, opts?: Record<string, unknown>): Promise<OcrResult>;
}
// END OCR_ABSTRACTION
