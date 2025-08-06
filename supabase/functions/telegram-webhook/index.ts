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
    console.log(`[${new Date().toISOString()}] Webhook called: ${req.method} ${req.url}`);
    
    if (req.method === "OPTIONS") {
      console.log("CORS preflight request handled");
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      console.log(`Method ${req.method} not allowed`);
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

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasTelegramToken: !!telegramToken,
      hasAdminId: !!adminId
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response("Server configuration error", { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Parse the incoming update
    const update: TelegramUpdate = await req.json();
    console.log("Received update:", JSON.stringify(update, null, 2));
    
    const message = update.message;

    if (!message || !message.from) {
      console.log("No message to process in update");
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

    console.log("Processing message:", {
      user_id,
      display_name,
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      date
    });

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

    console.log("Message inserted successfully into database");

    // Forward message to admin if configured
    if (telegramToken && adminId && text.trim()) {
      const adminMessage = `📨 New message from ${display_name} (ID: ${user_id}):\n\n${text}`;
      
      console.log("Forwarding message to admin:", adminId);
      
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
          const errorText = await telegramResponse.text();
          console.error("Failed to send message to admin:", errorText);
        } else {
          console.log("Message forwarded to admin successfully");
        }
      } catch (error) {
        console.error("Error sending message to admin:", error);
      }
    }

    console.log("Webhook processing completed successfully");
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