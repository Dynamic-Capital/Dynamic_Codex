import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
const BINANCE_SECRET_KEY = Deno.env.get("BINANCE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_USER_IDS = ["225513686"];

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required environment variables");
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Track pending actions in-memory
const pendingWallet = new Map<number, number>();
const pendingPayment = new Map<number, number>();

async function sendMessage(
  chat_id: number,
  text: string,
  options: Record<string, unknown> = {},
) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, text, parse_mode: "Markdown", ...options }),
  });
}

async function deleteMessage(chat_id: number, message_id: number) {
  await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, message_id }),
  });
}

async function saveScreenshot(
  supabase: ReturnType<typeof createClient>,
  user_id: number,
  file_id: string,
) {
  const fileInfo = await fetch(
    `${TELEGRAM_API}/getFile?file_id=${file_id}`,
  ).then((r) => r.json());
  const filePath = fileInfo?.result?.file_path;
  if (!filePath) return { error: { message: "Unable to fetch file" } };
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const image = await fetch(fileUrl).then((r) => r.arrayBuffer());
  const fileName = `receipts/${user_id}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("payment_receipts")
    .upload(fileName, new Uint8Array(image), {
      contentType: "image/jpeg",
      upsert: true,
    });
  return { error, path: fileName };
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

  const ADMIN_COMMANDS = [
    "/admin",
    "/listusers",
    "/approve",
    "/distribute",
    "/sendreport",
    "/broadcast",
    "/listinvestments",
    "/toggleaccess",
    "/setcmd",
  ];

  if (
    text.startsWith("/") &&
    ADMIN_COMMANDS.includes(text.split(" ")[0]) &&
    !ADMIN_USER_IDS.includes(String(user_id))
  ) {
    await sendMessage(chat_id, "❌ This command is for admins only.");
    return new Response("ok", { status: 200 });
  }

  if (text === "/start") {
    const keyboard = {
      keyboard: [
        [{ text: "/register" }, { text: "/wallet" }],
        [{ text: "/invest" }, { text: "/myshares" }],
        [{ text: "/report" }, { text: "/withdraw" }],
        [{ text: "/support" }, { text: "/help" }],
      ],
      resize_keyboard: true,
    };
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text:
          "👋 *Welcome to Dynamic Capital Fund Bot!*\nUse the menu below to get started.",
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }),
    }).then((r) => r.json());
    setTimeout(() => {
      sendMessage(chat_id, "⏳ Need help? Tap /help for commands.");
    }, 60_000);
    setTimeout(() => {
      deleteMessage(chat_id, res.result?.message_id);
    }, 300_000);
    return new Response("ok", { status: 200 });
  }

  if (text === "/wallet") {
    pendingWallet.set(user_id, chat_id);
    await sendMessage(chat_id, "💳 Send your USDT wallet address.");
    setTimeout(() => {
      if (pendingWallet.has(user_id)) {
        sendMessage(chat_id, "⌛ Still waiting for your wallet address.");
      }
    }, 60_000);
    return new Response("ok", { status: 200 });
  }

  if (pendingWallet.has(user_id) && text && !text.startsWith("/")) {
    const { error } = await supabase
      .from("bot_users")
      .upsert({ user_id, username, wallet_address: text });
    if (error) {
      await sendMessage(chat_id, `⚠️ Could not save wallet: ${error.message}`);
    } else {
      await sendMessage(chat_id, "✅ Wallet saved.");
    }
    pendingWallet.delete(user_id);
    return new Response("ok", { status: 200 });
  }

  if (text === "/invest") {
    pendingPayment.set(user_id, chat_id);
    await sendMessage(chat_id, "📸 Please upload your payment screenshot.");
    setTimeout(() => {
      if (pendingPayment.has(user_id)) {
        sendMessage(chat_id, "⌛ Waiting on your screenshot..." );
      }
    }, 600_000); // 10 minutes
    return new Response("ok", { status: 200 });
  }

  if (pendingPayment.has(user_id) && message.photo) {
    const file_id = message.photo[message.photo.length - 1].file_id;
    const { error, path } = await saveScreenshot(supabase, user_id, file_id);
    if (!error) {
      await supabase
        .from("payments")
        .insert({ user_id, screenshot_path: path, status: "pending" });
      await sendMessage(chat_id, "✅ Screenshot received. We'll review it soon.");
    } else {
      await sendMessage(chat_id, `❌ Upload failed: ${error.message}`);
    }
    pendingPayment.delete(user_id);
    return new Response("ok", { status: 200 });
  }

  // Default response: check dynamic commands
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
