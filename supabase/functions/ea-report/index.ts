import { createClient } from "npm:@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const VERSION = Deno.env.get("VERSION") ?? "0.0.0";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
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
        name: "ea-report",
        version: VERSION,
        time: new Date().toISOString(),
        checks: { env: missingEnv, db, dryRun: "skipped" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("ADMIN_USER_ID");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from("ea_reports").insert({
    report: payload,
  });
  if (error) {
    return new Response(
      JSON.stringify({
        error: "Database insert failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (telegramToken && chatId) {
    const summary = `EA Report:\n<pre>${
      JSON.stringify(payload, null, 2)
    }</pre>`;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: summary,
          parse_mode: "HTML",
        }),
      });
    } catch {
      /* ignore telegram errors */
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
