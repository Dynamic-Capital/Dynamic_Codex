// BEGIN OCR_POLICY
const failureCounts = new Map<string, number>();
const vendors = ["vision", "ocrspace", "tesseract"] as const;

type Vendor = typeof vendors[number];

interface InputMeta {
  isPdf?: boolean;
  pages?: number;
  sizeBytes?: number;
  offline?: boolean;
  cheap?: boolean;
}

function pickVendor(meta: InputMeta): { vendor: Vendor; reason: string } {
  let vendor: Vendor = "vision";
  let reason = "default";

  if (meta.isPdf || (meta.pages ?? 1) > 1) {
    vendor = "vision";
    reason = "pdf or multi-page";
  } else if ((meta.sizeBytes ?? 0) < 1_000_000) {
    vendor = "ocrspace";
    reason = "image <1MB";
  } else if (meta.offline || meta.cheap) {
    vendor = "tesseract";
    reason = "offline/cheap";
  }

  const threshold = Number(Deno.env.get("OCR_FAIL_THRESHOLD") ?? "3");
  const failures = failureCounts.get(vendor) ?? 0;
  if (failures > threshold) {
    const idx = vendors.indexOf(vendor);
    vendor = vendors[(idx + 1) % vendors.length];
    reason += `; failover after ${failures} failures`;
  }

  console.log(`[OCR] vendor=${vendor} reason=${reason}`);
  return { vendor, reason };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("health") === "1") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const failedVendor = url.searchParams.get("failedVendor") as Vendor | null;
  if (failedVendor) {
    failureCounts.set(failedVendor, (failureCounts.get(failedVendor) ?? 0) + 1);
    return new Response(null, { status: 204 });
  }

  let meta: InputMeta = {};
  try {
    meta = await req.json();
  } catch {
    /* ignore parse errors */
  }

  const { vendor, reason } = pickVendor(meta);
  return new Response(JSON.stringify({ vendor, reason }), {
    headers: { "Content-Type": "application/json" },
  });
});
// END OCR_POLICY
