import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment configuration
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_USER_IDS = ["225513686"]; // replace with your Telegram ID

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper to call Telegram API endpoints
async function telegram(method: string, body: Record<string, unknown>) {
  await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// Send a message and optionally auto delete it
async function sendMessage(
  chat_id: number,
  text: string,
  options: { reply_markup?: unknown; auto_delete_ms?: number } = {}
) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, ...options })
  });
  const data = await res.json();
  if (options.auto_delete_ms) {
    const message_id = data.result?.message_id;
    setTimeout(() => {
      telegram("deleteMessage", { chat_id, message_id });
    }, options.auto_delete_ms);
  }
  return data;
}

function followUp(chat_id: number, text: string, delayMs: number) {
  setTimeout(() => {
    sendMessage(chat_id, text);
  }, delayMs);
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

  // Log incoming message
  await supabase.from("messages").insert({ user_id, username, text });

  // Check conversation state
  const { data: state } = await supabase
    .from("user_states")
    .select("action")
    .eq("user_id", user_id)
    .single();

  if (state?.action === "awaiting_wallet" && !text.startsWith("/")) {
    await supabase
      .from("payment_methods")
      .upsert({ user_id, method: "USDT", address: text });
    await supabase.from("user_states").delete().eq("user_id", user_id);
    await sendMessage(chat_id, "✅ Wallet saved!");
    return new Response("ok", { status: 200 });
  }

  if (state?.action === "awaiting_screenshot" && message.photo) {
    const photo = message.photo.pop();
    if (photo) {
      const fileResp = await fetch(
        `${TELEGRAM_API}/getFile?file_id=${photo.file_id}`
      );
      const fileData = await fileResp.json();
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
      const img = await fetch(fileUrl);
      const buffer = new Uint8Array(await img.arrayBuffer());
      const filename = `${user_id}-${Date.now()}.jpg`;
      await supabase.storage
        .from("screenshots")
        .upload(filename, buffer, { contentType: "image/jpeg" });
      await supabase
        .from("investments")
        .insert({ user_id, screenshot: filename });
      await supabase.from("user_states").delete().eq("user_id", user_id);
      await sendMessage(chat_id, "🖼️ Screenshot received. Thank you!", {
        auto_delete_ms: 30000,
      });
    }
    return new Response("ok", { status: 200 });
  }

  // Built‑in commands
  if (text === "/start") {
    await supabase
      .from("bot_users")
      .insert({ user_id, username })
      .onConflict("user_id")
      .ignore();
    await sendMessage(
      chat_id,
      "👋 Welcome to Dynamic Capital Fund Bot! Choose an option below:",
      {
        reply_markup: {
          keyboard: [
            ["/register", "/wallet"],
            ["/invest", "/myshares"],
            ["/report", "/withdraw"],
            ["/support", "/help"],
          ],
          resize_keyboard: true,
        },
      }
    );
    return new Response("ok", { status: 200 });
  }

  if (text === "/register") {
    const { error } = await supabase
      .from("bot_users")
      .insert({ user_id, username })
      .onConflict("user_id")
      .ignore();
    if (error) {
      await sendMessage(chat_id, "⚠️ Registration failed.");
    } else {
      await sendMessage(chat_id, "✅ Registration successful!");
    }
    return new Response("ok", { status: 200 });
  }

  if (text === "/wallet") {
    await supabase
      .from("user_states")
      .upsert({ user_id, action: "awaiting_wallet" });
    await sendMessage(chat_id, "🔐 Send your USDT wallet address.");
    followUp(chat_id, "⏳ Still waiting for your wallet address...", 60000);
    return new Response("ok", { status: 200 });
  }

  if (text === "/invest") {
    await supabase
      .from("user_states")
      .upsert({ user_id, action: "awaiting_screenshot" });
    await sendMessage(
      chat_id,
      "💰 Please send a screenshot of your payment.",
      { auto_delete_ms: 60000 }
    );
    return new Response("ok", { status: 200 });
  }

  if (text === "/admin") {
    if (!ADMIN_USER_IDS.includes(String(user_id))) {
      await sendMessage(chat_id, "⛔ Unauthorized");
      return new Response("ok", { status: 200 });
    }
    await sendMessage(chat_id, "🛠️ Admin panel", {
      reply_markup: {
        keyboard: [["/listusers", "/listinvestments"], ["/broadcast"]],
        resize_keyboard: true,
      },
    });
    return new Response("ok", { status: 200 });
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
