import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message || !message.from) {
    return new Response("No message to process", { status: 200 });
  }

  // Get secrets from environment
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const adminId = Deno.env.get("ADMIN_USER_ID");
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2.38.3"
  );
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Prepare message data
  const { id: user_id, username } = message.from;
  const text = message.text || "";
  const date = new Date((message.date || Date.now()) * 1000).toISOString();

  // Insert message record
  const { error } = await supabase
    .from("messages")
    .insert([{ user_id, username, text, date }]);

  if (error) {
    console.error("Supabase error:", error);
  }

  if (telegramToken && adminId) {
    const textToSend = `Message from ${username ?? user_id}: ${text}`;
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminId, text: textToSend }),
    });
  }

  return new Response("ok", { status: 200 });
});
