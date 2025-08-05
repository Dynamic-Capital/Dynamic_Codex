# Telegram Dynamic Pool Bot Setup

This repository contains a Supabase Edge Function and supporting configuration for a Telegram bot. Incoming messages are stored in a Supabase table and optionally forwarded to an administrator.

## Configuration

1. Copy `.env.example` to `.env` and update the values:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `ADMIN_USER_ID`

2. Deploy the function:

   ```bash
   supabase functions deploy telegram-webhook --no-verify-jwt
   ```

3. Set the Telegram webhook, replacing `<FUNCTION_URL>` with the deployed URL:

   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d url=<FUNCTION_URL>
   ```

Messages sent to the bot will be inserted into the `messages` table and forwarded to the admin user.
