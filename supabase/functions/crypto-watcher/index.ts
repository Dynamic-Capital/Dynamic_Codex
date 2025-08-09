import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const VERSION = Deno.env.get("VERSION") ?? "0.0.0";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (
    req.method === "GET" &&
    (url.searchParams.get("health") === "1" || url.pathname === "/health")
  ) {
    const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const missingEnv = requiredEnv.filter((k) => !Deno.env.get(k));
    let db: "ok" | "fail" | "skipped" = "skipped";
    if (missingEnv.length === 0) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { error } = await supabase
          .from("messages")
          .select("id", { head: true })
          .limit(1);
        db = error ? "fail" : "ok";
      } catch {
        db = "fail";
      }
    }
    return new Response(
      JSON.stringify({
        ok: true,
        name: "crypto-watcher",
        version: VERSION,
        time: new Date().toISOString(),
        checks: { env: missingEnv, db, dryRun: dryRun ? "ok" : "skipped" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true, dryRun }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
