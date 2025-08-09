// BEGIN OCR_VENDOR_INTERFACE
export interface OcrVendor {
  /** Provider identifier */
  readonly name: string;
  /** Maximum duration for a single request in milliseconds */
  readonly timeoutMs: number;
  /** Number of retry attempts after the initial request */
  readonly maxRetries: number;
  /** Approximate USD cost per image processed */
  readonly usdPerImage: number;
  /**
   * Perform OCR on a base64-encoded image and return extracted text.
   * @param base64Image image encoded as base64 without data URI prefix
   */
  recognize(base64Image: string): Promise<string>;
}
// END OCR_VENDOR_INTERFACE
