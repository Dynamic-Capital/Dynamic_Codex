// BEGIN OCR_WORKER
import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const limit = Number(url.searchParams.get("limit") ?? "5");
  const dryRun = url.searchParams.get("dryRun") === "1";

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: jobs, error } = await supabase
    .from("ocr_jobs")
    .select("id, file_hash, retries, vendor")
    .eq("status", "queued")
    .order("id", { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch jobs", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const endpoints = JSON.parse(Deno.env.get("OCR_ENDPOINTS") || "{}");
  let processed = 0;

  for (const job of jobs ?? []) {
    processed += 1;
    if (!dryRun) {
      await supabase.from("ocr_jobs").update({ status: "running" }).eq("id", job.id);
    }

    const endpoint = endpoints[job.vendor];
    if (!endpoint) {
      if (!dryRun) {
        await supabase.from("ocr_jobs").update({ status: "error" }).eq("id", job.id);
      }
      continue;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_hash: job.file_hash }),
      });

      if (response.status === 429 || response.status >= 500) {
        const wait = Math.min(1000 * 2 ** job.retries, 30000);
        await delay(wait);
        if (!dryRun) {
          await supabase
            .from("ocr_jobs")
            .update({ status: "queued", retries: job.retries + 1 })
            .eq("id", job.id);
        }
      } else if (!response.ok) {
        if (!dryRun) {
          await supabase.from("ocr_jobs").update({ status: "error" }).eq("id", job.id);
        }
      } else {
        if (!dryRun) {
          await supabase.from("ocr_jobs").update({ status: "done" }).eq("id", job.id);
        }
      }
    } catch (_e) {
      if (!dryRun) {
        await supabase.from("ocr_jobs").update({ status: "error" }).eq("id", job.id);
      }
    }
  }

  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
// END OCR_WORKER
