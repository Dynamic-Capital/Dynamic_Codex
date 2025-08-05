import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
const BINANCE_SECRET_KEY = Deno.env.get("BINANCE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_USER_IDS = ["225513686"];

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message || !message.from) {
    return new Response("No message to process", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { id: user_id, username } = message.from;
  const text = message.text || "";
  const date = new Date((message.date || Date.now()) * 1000).toISOString();

  const { error } = await supabase
    .from("messages")
    .insert([{ user_id, username, text, date }]);

  if (error) {
    console.error("Supabase error:", error);
  }

  return new Response("ok", { status: 200 });
});
