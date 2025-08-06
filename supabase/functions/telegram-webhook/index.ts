import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

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
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const adminId = Deno.env.get("ADMIN_USER_ID");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response("Server configuration error", { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Parse the incoming update
    const update: TelegramUpdate = await req.json();
    const message = update.message;

    if (!message || !message.from) {
      return new Response("No message to process", { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare message data
    const { id: user_id, username, first_name, last_name } = message.from;
    const text = message.text || "";
    const date = new Date(message.date * 1000).toISOString();
    const display_name = username || `${first_name || ''} ${last_name || ''}`.trim() || `User ${user_id}`;

    // Insert message into database
    const { error: insertError } = await supabase
      .from("messages")
      .insert([{ 
        user_id, 
        username: display_name, 
        text, 
        date 
      }]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return new Response("Database error", { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Forward message to admin if configured
    if (telegramToken && adminId && text.trim()) {
      const adminMessage = `📨 New message from ${display_name} (ID: ${user_id}):\n\n${text}`;
      
      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              chat_id: adminId, 
              text: adminMessage,
              parse_mode: "HTML"
            }),
          }
        );

        if (!telegramResponse.ok) {
          console.error("Failed to send message to admin:", await telegramResponse.text());
        }
      } catch (error) {
        console.error("Error sending message to admin:", error);
      }
    }

    return new Response("OK", { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { 
      status: 500,
      headers: corsHeaders 
    });
  }
});