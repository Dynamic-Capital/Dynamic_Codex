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

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chat_id: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text })
  });
}

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
  const chat_id = message.chat.id;
  const text = message.text || "";
  const date = new Date((message.date || Date.now()) * 1000).toISOString();

  const { error } = await supabase
    .from("messages")
    .insert([{ user_id, username, text, date }]);

  if (error) {
    console.error("Supabase error:", error);
  }

  // Allow admins to set dynamic commands: /setcmd /hello Hello world
  if (ADMIN_USER_IDS.includes(String(user_id)) && text.startsWith("/setcmd")) {
    const parts = text.split(" ");
    if (parts.length >= 3) {
      const command = parts[1];
      const response = parts.slice(2).join(" ");
      const { error: cmdError } = await supabase
        .from("bot_commands")
        .upsert({ command, response });
      if (cmdError) {
        await sendMessage(chat_id, `Failed to save command: ${cmdError.message}`);
      } else {
        await sendMessage(chat_id, `Command ${command} saved.`);
      }
    } else {
      await sendMessage(chat_id, "Usage: /setcmd <command> <response>");
    }
    return new Response("ok", { status: 200 });
  }

  // Execute stored commands
  if (text.startsWith("/")) {
    const { data: cmd } = await supabase
      .from("bot_commands")
      .select("response")
      .eq("command", text)
      .single();
    if (cmd?.response) {
      await sendMessage(chat_id, cmd.response);
      return new Response("ok", { status: 200 });
    }
  }

  return new Response("ok", { status: 200 });
});
