// BEGIN OCRCACHE
import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function hashFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("health") === "1") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const endpoints = Deno.env.get("OCR_ENDPOINTS");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Missing file" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fileHash = await hashFile(file);

  const { data: existing, error: lookupError } = await supabase
    .from("ocr_cache")
    .select("result")
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (lookupError) {
    return new Response(JSON.stringify({ error: "Cache lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existing) {
    return new Response(
      JSON.stringify({ cached: true, result: existing.result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (url.searchParams.get("dryRun") === "1") {
    return new Response(JSON.stringify({ file_hash: fileHash, dryRun: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!endpoints) {
    return new Response(JSON.stringify({ error: "No OCR endpoints configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let vendor: string;
  let ocrResult: unknown;
  try {
    const list = JSON.parse(endpoints) as string[];
    vendor = list[0];
    const resp = await fetch(vendor, { method: "POST", body: file });
    ocrResult = await resp.json();
  } catch {
    return new Response(JSON.stringify({ error: "OCR request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: insertError } = await supabase.from("ocr_cache").insert({
    file_hash: fileHash,
    vendor,
    result: ocrResult as Record<string, unknown>,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: "Cache insert failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ cached: false, result: ocrResult }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
// END OCRCACHE
