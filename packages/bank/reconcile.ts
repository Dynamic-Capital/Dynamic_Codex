import { extract } from "../ocr/extract.ts";

export interface BankTransaction {
  memo?: string;
  ocrText?: string;
}

export interface ReconcileResult {
  memo?: string;
  parsed?: ReturnType<typeof extract>["fields"];
}

export function reconcile(tx: BankTransaction): ReconcileResult {
  // BEGIN BANK_OCR_FALLBACK
  if (tx.memo && tx.memo.trim()) {
    return { memo: tx.memo };
  }
  if (tx.ocrText) {
    const { fields } = extract(tx.ocrText);
    return { parsed: fields };
  }
  return {};
  // END BANK_OCR_FALLBACK
}
