import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { Bot } from 'npm:grammy@1.19.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  text?: string;
  date: number;
  chat: {
    id: number;
    type: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

async function dispatchWorkflow(
  workflow: string,
  inputs: Record<string, string>,
  token?: string,
  repo?: string,
): Promise<boolean> {
  if (!token || !repo) return false;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    },
  );
  return res.ok;
}

async function fetchLastDeployStatus(
  token?: string,
  repo?: string,
): Promise<string> {
  if (!token || !repo) return "GitHub credentials missing";
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!res.ok) return "Failed to fetch deploy status";
  const data = await res.json();
  const run = data.workflow_runs?.[0];
  if (!run) return "No deploy runs found";
  return `Last deploy: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ""}`;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] === WEBHOOK START ===`);
  console.log(`Method: ${req.method}, URL: ${req.url}`);
  
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      console.log("✅ CORS preflight request handled");
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      console.log(`❌ Method ${req.method} not allowed`);
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get and validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc";
    const adminIds = (Deno.env.get("ADMIN_USER_ID") || "225513686")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id);
    const adminId = adminIds[0];
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const githubRepo = Deno.env.get("GITHUB_REPOSITORY");
    const bot = telegramToken ? new Bot(telegramToken) : undefined;

    console.log("🔧 Environment variables check:");
    console.log(`- Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Telegram Token: ${telegramToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Admin IDs: ${adminIds.length ? '✅ Set' : '❌ Missing'}`);
    console.log(`- GitHub Token: ${githubToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`- GitHub Repo: ${githubRepo ? '✅ Set' : '❌ Missing'}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing critical Supabase configuration");
      return new Response(JSON.stringify({ 
        error: "Server configuration error",
        details: "Missing Supabase credentials"
      }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse the incoming update
    let update: TelegramUpdate;
    try {
      const body = await req.text();
      console.log("📨 Raw request body:", body);
      update = JSON.parse(body);
      console.log("📋 Parsed update:", JSON.stringify(update, null, 2));
    } catch (error) {
      console.error("❌ Failed to parse request body:", error);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON payload" 
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const message = update.message;

    if (!message || !message.from) {
      console.log("⚠️ No message to process in update");
      return new Response(JSON.stringify({ 
        status: "ok", 
        message: "No message to process" 
      }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle commands first
    if (message.text && message.text.startsWith('/')) {
      console.log(`🤖 Processing command: ${message.text}`);

      const [command, ...args] = message.text.split(/\s+/);
      const isAdmin = adminIds.includes(message.from.id.toString());
      let responseText = "";

      switch (command.toLowerCase()) {
        case '/start':
          responseText = `🤖 Welcome to the Dynamic Pool Bot!\n\n` +
                        `I'm here to help you manage your pool activities.\n\n` +
                        `Available commands:\n` +
                        `• /start - Show this welcome message\n` +
                        `• /help - Get help information\n` +
                        `• /status - Check bot status\n\n` +
                        `Just send me any message and I'll store it for you!`;
          break;
        case '/help':
          responseText = `🆘 Help Information\n\n` +
                        `This bot stores all your messages and provides real-time monitoring.\n\n` +
                        `Features:\n` +
                        `• Message storage in database\n` +
                        `• Real-time dashboard updates\n` +
                        `• Admin notifications\n` +
                        `• Message history tracking\n\n` +
                        `Send any message to get started!`;
          break;
        case '/status':
          if (isAdmin) {
            responseText = await fetchLastDeployStatus(githubToken, githubRepo);
          } else {
            responseText = `✅ Bot Status: Active\n\n` +
                          `• Database: Connected\n` +
                          `• Webhook: Working\n` +
                          `• Real-time: Enabled\n` +
                          `• Admin IDs: ${adminIds.join(', ')}\n\n` +
                          `Everything is working perfectly!`;
          }
          break;
        case '/health':
          if (!isAdmin) {
            responseText = '⛔ Unauthorized';
          } else {
            const ok = await dispatchWorkflow('verify.yml', { dry_run: 'true' }, githubToken, githubRepo);
            responseText = ok
              ? '🩺 Verify workflow dispatched (dry run)'
              : '❌ Failed to dispatch verify workflow';
          }
          break;
        case '/deploy':
          if (!isAdmin) {
            responseText = '⛔ Unauthorized';
          } else {
            const env = args[0] || '';
            const ok = await dispatchWorkflow('deploy.yml', env ? { environment: env } : {}, githubToken, githubRepo);
            responseText = ok
              ? `🚀 Deploy workflow dispatched${env ? ' for ' + env : ''}`
              : '❌ Failed to dispatch deploy workflow';
          }
          break;
        default:
          responseText = `❓ Unknown command: ${message.text}\n\n` +
                        `Available commands:\n` +
                        `• /start - Welcome message\n` +
                        `• /help - Help information\n` +
                        `• /status - Bot status\n\n` +
                        `Or just send me a regular message!`;
      }

      // Send command response immediately
      if (bot && responseText) {
        console.log("📤 Sending command response...");
        try {
          await bot.api.sendMessage(message.chat.id, responseText, { parse_mode: "HTML" });
          console.log("✅ Command response sent successfully");
        } catch (error) {
          console.error("❌ Error sending command response:", error);
        }
      }

      // Still store the command in database for tracking
    }
    // Initialize Supabase client
    console.log("🔌 Initializing Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare message data
    const { id: user_id, username, first_name, last_name } = message.from;
    const text = message.text || "";
    const date = new Date(message.date * 1000).toISOString();
    const display_name = username || `${first_name || ''} ${last_name || ''}`.trim() || `User ${user_id}`;

    console.log("📝 Processing message:");
    console.log(`- User ID: ${user_id}`);
    console.log(`- Display Name: ${display_name}`);
    console.log(`- Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    console.log(`- Date: ${date}`);
    console.log(`- Chat ID: ${message.chat.id}`);

    // Test database connection first
    console.log("🔍 Testing database connection...");
    try {
      const { error: testError } = await supabase
        .from("messages")
        .select("count")
        .limit(1);

      if (testError) {
        console.error("❌ Database connection test failed:", testError);
        throw testError;
      }
      console.log("✅ Database connection successful");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      return new Response(JSON.stringify({
        error: "Database connection failed",
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Insert message into database
    console.log("💾 Inserting message into database...");
    const { data: insertData, error: insertError } = await supabase
      .from("messages")
      .insert([{ 
        user_id: Number(user_id), 
        username: display_name, 
        text: text, 
        date: date 
      }])
      .select();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return new Response(JSON.stringify({ 
        error: "Database insert failed",
        details: insertError.message
      }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Message inserted successfully:", insertData);

    // Send confirmation message back to user (only for non-commands)
    if (bot && text.trim() && !text.startsWith('/')) {
      console.log("📤 Sending confirmation to user...");
      try {
        const confirmationMessage = `✅ Message received and stored!\n\nYour message: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
        await bot.api.sendMessage(message.chat.id, confirmationMessage, { parse_mode: "HTML" });
        console.log("✅ Confirmation sent to user successfully");
      } catch (error) {
        console.error("❌ Error sending confirmation to user:", error);
      }
    }

    // Forward message to admin if configured and different from sender (skip commands)
    if (bot && adminId && text.trim() && user_id.toString() !== adminId && !text.startsWith('/')) {
      console.log("📨 Forwarding message to admin...");
      try {
        const adminMessage = `📨 <b>New message from ${display_name}</b>\n` +
                           `👤 User ID: <code>${user_id}</code>\n` +
                           `💬 Chat ID: <code>${message.chat.id}</code>\n` +
                           `🕒 Time: ${new Date(message.date * 1000).toLocaleString()}\n\n` +
                           `📝 Message:\n<blockquote>${text}</blockquote>`;
        await bot.api.sendMessage(adminId, adminMessage, { parse_mode: "HTML" });
        console.log("✅ Message forwarded to admin successfully");
      } catch (error) {
        console.error("❌ Error sending message to admin:", error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processing completed successfully in ${processingTime}ms`);
    console.log(`[${new Date().toISOString()}] === WEBHOOK END ===`);
    
    return new Response(JSON.stringify({ 
      status: "ok",
      message: "Message processed successfully",
      processing_time_ms: processingTime
    }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Webhook error:", error);
    console.log(`[${new Date().toISOString()}] === WEBHOOK ERROR END (${processingTime}ms) ===`);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message,
      processing_time_ms: processingTime
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});