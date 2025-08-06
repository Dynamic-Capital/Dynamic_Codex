# Telegram Dynamic Pool Bot

A complete Telegram bot implementation with Supabase backend for message storage and real-time dashboard monitoring.

## Features

- 📱 Telegram webhook integration
- 💾 Message storage in Supabase
- 📊 Real-time dashboard for monitoring messages
- 🔄 Live message updates via Supabase realtime
- 👤 Admin message forwarding
- 🎨 Modern UI with dark/light theme support

## Setup Instructions

### 1. Supabase Configuration

First, connect to Supabase by clicking the "Connect to Supabase" button in the top right corner of this interface.

### 2. Environment Variables

The following environment variables are automatically configured when you connect to Supabase:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

For the edge function, you'll need to set these in your Supabase dashboard:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token
- `ADMIN_USER_ID` - Your Telegram user ID for admin notifications

### 3. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the instructions
3. Save the bot token you receive
4. Get your Telegram user ID by messaging [@userinfobot](https://t.me/userinfobot)

### 4. Database Setup

The database migration will be automatically applied when you connect to Supabase. It creates:
- `messages` table with proper structure
- Row Level Security (RLS) policies
- Real-time subscriptions enabled

### 5. Deploy the Edge Function

The edge function is located in `supabase/functions/telegram-webhook/`. It will be automatically deployed when you connect to Supabase.

### 6. Set Telegram Webhook

After deployment, set your Telegram webhook URL:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d url=https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/telegram-webhook
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `<YOUR_SUPABASE_PROJECT>` with your Supabase project reference

## How It Works

1. **Message Reception**: Users send messages to your Telegram bot
2. **Webhook Processing**: Telegram sends updates to your Supabase edge function
3. **Data Storage**: Messages are stored in the `messages` table
4. **Admin Notification**: Messages are forwarded to the configured admin user
5. **Real-time Dashboard**: The web dashboard shows all messages in real-time

## Dashboard Features

- **Real-time Updates**: New messages appear instantly without refresh
- **Message History**: View up to 100 recent messages
- **User Information**: See username and user ID for each message
- **Timestamps**: Formatted message dates and times
- **Responsive Design**: Works on desktop and mobile devices

## Development

To run the dashboard locally:

```bash
npm install
npm run dev
```

## Security

- All database operations use Row Level Security (RLS)
- Edge function uses service role for secure database access
- Environment variables are properly secured
- CORS headers configured for web dashboard

## Troubleshooting

1. **Messages not appearing**: Check that your webhook URL is correctly set
2. **Database errors**: Verify your Supabase connection and RLS policies
3. **Admin notifications not working**: Confirm your bot token and admin user ID
4. **Real-time not working**: Ensure your Supabase project has realtime enabled

## File Structure

```
├── supabase/
│   ├── functions/telegram-webhook/    # Edge function for webhook
│   └── migrations/                    # Database migrations
├── src/
│   ├── components/                    # React components
│   ├── lib/                          # Utilities and Supabase client
│   └── App.tsx                       # Main application
└── README.md                         # This file
```