/* eslint-disable no-console -- CLI script for env validation */
// BEGIN OCR_ENV_CHECK
import { exit } from "node:process";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    exit(1);
  }
  return value;
}

function parseArray(raw: string, name: string): string[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || !arr.every((v) => typeof v === "string")) {
      throw new Error();
    }
    return arr as string[];
  } catch {
    console.error(`${name} must be a JSON array of strings`);
    exit(1);
  }
}

if (process.argv.includes("--ocr")) {
  requireEnv("OCR_PROVIDER");
  parseArray(requireEnv("OCR_ENDPOINTS"), "OCR_ENDPOINTS");
  // OCR_API_KEY is optional and checked by services that require it.
  const minConfidence = Number(process.env.OCR_MIN_CONFIDENCE ?? "0.8");
  if (Number.isNaN(minConfidence) || minConfidence <= 0 || minConfidence > 1) {
    console.error("OCR_MIN_CONFIDENCE must be a number between 0 and 1");
    exit(1);
  }
  const allowedMime = process.env.OCR_ALLOWED_MIME
    ? parseArray(process.env.OCR_ALLOWED_MIME, "OCR_ALLOWED_MIME")
    : ["image/jpeg", "image/png", "application/pdf"];
  void allowedMime;
  console.log("OCR secret check passed.");
}
// END OCR_ENV_CHECK
