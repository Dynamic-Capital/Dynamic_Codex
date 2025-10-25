<!-- BEGIN DOCS:SECTION:overview -->
# Telegram Dynamic Pool Bot • Personal Project

A Telegram bot + Mini App (WebApp) running on **Supabase Edge Functions** with a **central config hub** in Postgres. Payments via **bank transfer** and **crypto (USDT TRON/BSC)** with auto-verification. Real-time dashboard, health checks, and ChatOps.

> **Maintainer:** <your name>  
> **Primary bot:** @Dynamic_CODEX_BOT  
> **Environment:** Supabase (functions+DB+storage), GitHub CI/CD, Codex for coding
<!-- END DOCS:SECTION:overview -->

<!-- BEGIN DOCS:SECTION:whats-in-here -->
## What’s in here
- Edge functions: `telegram-webhook`, `bank-inbox`, `crypto-watcher`, `admin-tools`, (`ea-report` optional)
- Mini App: `/apps/webapp` (Vite + TS)
- Core packages: `packages/core|bank|crypto|telegram`
- Infra scripts: verify, secrets, connectivity, cert checks
- Config Hub in DB: `app_config` (live-edit, no redeploy)
<!-- END DOCS:SECTION:whats-in-here -->

<!-- BEGIN DOCS:SECTION:quick-start -->
## Quick start
```bash
git fetch --all --prune
git checkout $(git remote show origin | sed -n '/HEAD branch/s/.*: //p')
git pull --rebase
node -v && deno --version && npx supabase@latest --version
npm run check:secrets || true
npm run verify:functions || true
npm run check:connect || true
```
<!-- END DOCS:SECTION:quick-start -->

<!-- BEGIN DOCS:SECTION:edit-policy -->
## Edit policy
✅ **Editable:** edge functions under `supabase/functions/`, packages, `/apps/webapp`, docs, and config files.
❌ **Do not edit:** applied migrations in `supabase/migrations`, generated files, committed secrets, or historical tags.
<!-- END DOCS:SECTION:edit-policy -->

<!-- BEGIN DOCS:SECTION:config-hub -->
## Config Hub
Live settings live in the `app_config` table. Update via the Mini App’s `/config` tab or SQL: changes apply instantly without redeploys.
<!-- END DOCS:SECTION:config-hub -->

<!-- BEGIN DOCS:SECTION:envs -->
## Environments & secrets
Names only—set these in Supabase or GitHub:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `ADMIN_USER_ID`, `VIP_CHAT_ID`, `WEBAPP_URL`, `BSC_RPC_URL`, `TRON_API_URL`, `USDT_BSC_CONTRACT`, `USDT_TRON_CONTRACT`, `MIN_CONF_BSC`, `MIN_CONF_TRON`, `BANK_CURRENCY`, `BANK_REF_PREFIX`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_IMPORT_SIGNATURE_SECRET`, `OCR_ENDPOINTS`.
<!-- END DOCS:SECTION:envs -->

<!-- BEGIN DOCS:SECTION:dev-scripts -->
## Dev scripts you'll use
- `npm run check:secrets` – confirm required secrets
- `npm run verify:functions` – unit checks for edge functions
- `npm run check:connect` – connectivity tests
- `npm run deploy:webapp` – build & ship the Mini App
<!-- END DOCS:SECTION:dev-scripts -->

<!-- BEGIN DOCS:SECTION:ci-cd -->
## CI/CD summary
`ci.yml` runs lint and verify scripts. `deploy.yml` ships functions and the Mini App. ChatOps commands like `/deploy` are handled by @Dynamic_CODEX_BOT.
<!-- END DOCS:SECTION:ci-cd -->

<!-- BEGIN DOCS:SECTION:accident-playbook -->
## Accident playbook
- **Webhook reset:** `curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook`
- **Bad deploy rollback:** `git revert <sha>` then trigger `/deploy`
- **Secret leak:** rotate in Supabase, update GitHub secrets, notify @Dynamic_Capital_Admin & @DynamicCapital_Support
<!-- END DOCS:SECTION:accident-playbook -->

<!-- BEGIN DOCS:SECTION:contributing -->
## Contributing
Create branches like `feat/`, `chore/`, or `docs/`. Use semantic commits and open PRs against the main branch with test results.
<!-- END DOCS:SECTION:contributing -->

<!-- BEGIN DOCS:SECTION:license -->
## License
Personal project — all rights reserved.
<!-- END DOCS:SECTION:license -->

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

✅ **Bot Username**: `@Dynamic_Pool_BOT`
✅ **Bot Token**: `8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc`
✅ **Admin User ID**: `225513686`

Your bot is already configured! You can find it at: [@Dynamic_Pool_BOT](https://t.me/Dynamic_Pool_BOT)

### 4. Database Setup

The database migration will be automatically applied when you connect to Supabase. It creates:
- `messages` table with proper structure
- Row Level Security (RLS) policies
- Real-time subscriptions enabled

### 5. Deploy Edge Functions

The Telegram webhook function lives in `supabase/functions/telegram-webhook/`.
An additional `ea-report` function under `supabase/functions/ea-report/` accepts JSON performance reports from your MQL5 Expert Advisor, stores them in the `ea_reports` table, and forwards a summary to Telegram.
Both functions are automatically deployed when you connect to Supabase.

### 6. Set Telegram Webhook

After deployment, you can set your Telegram webhook URL using the **Webhook Config** tab in the dashboard, or manually:

```bash
curl "https://api.telegram.org/bot8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc/setWebhook" \
  -d url=https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/telegram-webhook
```

Replace `<YOUR_SUPABASE_PROJECT>` with your actual Supabase project reference.

## 🔗 Your Webhook URL

Your webhook URL will be in this format:
```
https://YOUR_PROJECT.supabase.co/functions/v1/telegram-webhook
```

Use the **Webhook Config** tab to:
- ✅ See your exact webhook URL
- ✅ Check current webhook status
- ✅ Set webhook with one click
- ✅ Test webhook endpoint
- ✅ View webhook errors and diagnostics

## 🔧 Environment Variables to Set in Supabase

Make sure these are set in your Supabase Edge Function environment:
- `TELEGRAM_BOT_TOKEN`: `8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc`
- `ADMIN_USER_ID`: `225513686`

## 🧪 Testing Your Bot

Use the new "Telegram Test" tab to:
- ✅ Validate your bot token and connection
- ✅ Check webhook configuration status
- ✅ Test database connectivity
- ✅ Verify edge function deployment
- ✅ Send test messages directly to your bot
- ✅ Set webhook URL easily

## 📱 How to Test

1. **Go to "Telegram Test" tab**
2. **Click "Run Full Test"** to check all connections
3. **Send a test message** using the built-in sender
4. **Check your Telegram bot** - you should receive the test message
5. **Send a message to your bot** - it should appear in the dashboard

## 🤖 Bot Commands

Your bot now supports these commands:
- `/start` - Welcome message and bot introduction
- `/help` - Help information and features
- `/status` - Check bot status and connection

Commands are handled immediately and provide instant responses!

Your bot is now fully configured and ready to receive messages! The enhanced webhook function will:
- ✅ Store all messages in Supabase
- ✅ Handle bot commands (/start, /help, /status)
- ✅ Send confirmation back to users
- ✅ Forward messages to admin
- ✅ Provide detailed logging for debugging

## How It Works

1. **Message Reception**: Users send messages to your Telegram bot
2. **Webhook Processing**: Telegram sends updates to your Supabase edge function
3. **Data Storage**: Messages are stored in the `messages` table
4. **Admin Notification**: Messages are forwarded to the configured admin user
5. **Real-time Dashboard**: The web dashboard shows all messages in real-time

## System Health Monitoring

The dashboard includes a comprehensive health check system that verifies:
- ✅ Supabase database connection and schema
- ✅ Telegram bot token validation
- ✅ Webhook configuration status
- ✅ Edge function deployment and accessibility
- ✅ Real-time subscription functionality
- ✅ GitHub integration status

Use the "System Health" tab to run diagnostics and troubleshoot any issues.

## Dashboard Features

- **Real-time Updates**: New messages appear instantly without refresh
- **Message History**: View up to 100 recent messages
- **User Information**: See username and user ID for each message
- **Timestamps**: Formatted message dates and times
- **Responsive Design**: Works on desktop and mobile devices
- **Health Monitoring**: Comprehensive system status checking
- **Quick Actions**: Direct links to bot chat and admin panels

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