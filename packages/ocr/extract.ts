// BEGIN OCR_EXTRACT
export interface OCRFields {
  amount?: number;
  currency?: string;
  date?: string;
  referenceCode?: string;
  bankName?: string;
  transactionId?: string;
}

export interface OCRResult {
  fields: OCRFields;
  confidencePerField: { [K in keyof OCRFields]?: number };
}

const ARABIC_INDIC_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

function normalizeDigits(input: string): string {
  return input
    .split('')
    .map((ch) => ARABIC_INDIC_MAP[ch] ?? ch)
    .join('');
}

function parseDate(raw: string): string | undefined {
  const cleaned = raw.replace(/[-\.]/g, '/');
  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return undefined;
}

export function extract(text: string): OCRResult {
  const normalized = normalizeDigits(text);
  const fields: OCRFields = {};
  const confidence: OCRResult['confidencePerField'] = {};

  const amountMatch = /(?:amount|total)[:\-]?\s*([0-9.,]+)/i.exec(normalized);
  if (amountMatch) {
    fields.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    confidence.amount = 1;
  } else {
    confidence.amount = 0;
  }

  const currencyMatch = /(?:currency|cur|curr)[:\-]?\s*([A-Za-z]{3})/i.exec(normalized);
  if (currencyMatch) {
    fields.currency = currencyMatch[1].toUpperCase();
    confidence.currency = 1;
  } else {
    const symbolMatch = /(MVR|USD|EUR|GBP)/i.exec(normalized);
    if (symbolMatch) {
      fields.currency = symbolMatch[1].toUpperCase();
      confidence.currency = 0.8;
    } else {
      confidence.currency = 0;
    }
  }

  const dateMatch = /(?:date)[:\-]?\s*([0-9]{1,2}[\/.-][0-9]{1,2}[\/.-][0-9]{2,4}|[0-9]{4}[\/.-][0-9]{2}[\/.-][0-9]{2}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i.exec(
    normalized,
  );
  if (dateMatch) {
    const iso = parseDate(dateMatch[1]);
    if (iso) {
      fields.date = iso;
      confidence.date = 1;
    } else {
      confidence.date = 0.5;
    }
  } else {
    confidence.date = 0;
  }

  const refMatch = /(?:reference|ref(?:erence)?|memo)[:\-]?\s*([A-Za-z0-9-]+)/i.exec(
    normalized,
  );
  if (refMatch) {
    fields.referenceCode = refMatch[1];
    confidence.referenceCode = 1;
  } else {
    confidence.referenceCode = 0;
  }

  const bankMatch = /([A-Za-z ]+ bank|bank of maldives|BML)/i.exec(normalized);
  if (bankMatch) {
    fields.bankName = bankMatch[1].trim();
    confidence.bankName = 0.9;
  } else {
    confidence.bankName = 0;
  }

  const txMatch = /(?:transaction\s*id|txn\s*id|txid)[:\-]?\s*([A-Za-z0-9-]+)/i.exec(
    normalized,
  );
  if (txMatch) {
    fields.transactionId = txMatch[1];
    confidence.transactionId = 1;
  } else {
    confidence.transactionId = 0;
  }

  return { fields, confidencePerField: confidence };
}
// END OCR_EXTRACT
