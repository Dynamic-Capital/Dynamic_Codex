# Telegram Dynamic Pool Bot Setup

This README provides instructions for setting up the Telegram Dynamic Pool Bot.

## Supabase CLI Setup

To manage database migrations and link this repository with your Supabase project, install the Supabase CLI and run the following commands:

```bash
supabase init
supabase login
supabase link --project-ref qeejuomcapbdlhnjqjcc
```

The accompanying GitHub Actions workflow at `.github/workflows/migration.yml` automatically verifies and pushes migrations to the configured staging or production project whenever changes land on the `develop` or `main` branches.

## Option 2: GitHub → Supabase Sync Only

If you're using Codex with GitHub and Supabase, Deno doesn't need to be installed locally.

- Make code edits directly in GitHub or Codex.
- Push changes to `supabase/functions/telegram-bot/index.ts`.
- Supabase deploys Edge Functions automatically through GitHub Actions.

This approach works from any device and avoids a local Deno setup. Expect a short delay of roughly 5–10 seconds for GitHub to Supabase synchronization.

## Supabase Connection Test

Create a `.env` file with your project credentials:

```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

Run `npm test` to execute a small script that verifies the configuration and confirms the `bot_users` and `bot_commands` tables are reachable in Supabase.

### Bot Commands Table

Create a `bot_commands` table so the bot can store custom commands defined from Telegram:

```
create table bot_commands (
  command text primary key,
  response text not null
);
```

### Program the Bot from Telegram

Admins can teach the bot new commands directly from a chat using `/setcmd`:

```
/setcmd /hello Hello from the dynamic bot!
```

After saving, any user can invoke `/hello` and receive the stored response. Commands are stored in the `bot_commands` table above.

## Command Flow

### User Commands
- `/start` — Welcome message guiding new users to register.
- `/register` — Stores the user's Telegram ID, name, and username; warns if already registered.
- `/wallet` *(Coming Soon)* — Collects the user's USDT wallet address and saves it in `bot_users.wallet_address`.
- `/invest` *(Coming Soon)* — Submits an amount and TXID; creates a `pending` investment and notifies admins.
- `/myshares` *(Coming Soon)* — Displays share percentage, capital, and reinvested amount from the `shares` table.
- `/report` *(Coming Soon)* — Shows monthly profit breakdown and personal payout details when available.
- `/withdraw` *(Coming Soon)* — Initiates a withdrawal request after lock‑in checks and routes to admin approval.
- `/support` — Provides contact info such as `@DynamicCapitalAdmin` and optional FAQ links.
- `/help` — Lists all available commands with ✅ ready or ⏳ coming soon indicators.

### Admin Commands
- `/admin` *(Coming Soon)* — Text menu for managing users, investments, and reports.
- `/listusers` — Displays all registered users from `bot_users`.
- `/approve <TXID>` — Confirms an investment, updates the `shares` table, and notifies the user.
- `/distribute` *(Coming Soon)* — Runs profit distribution based on shares and updates `user_profits`.
- `/sendreport` — Manually broadcasts the monthly report to all users.
- `/broadcast <message>` — Sends a custom message to every user.
- `/listinvestments` — Lists all pending investments with TXID and amount.
- `/toggleaccess` — Locks or unlocks investor actions, e.g., during maintenance.

### Flow Summary
`/start → /register`
 ├─ if new user: save registration  
 └─ if existing user: inform already registered  
`/wallet → /invest → /myshares → /report → /withdraw`

Admin panel: `/admin → /listusers → /approve → /distribute → /broadcast`

## Payment Handling & Screenshots

The bot now guides users with emoji‑rich messages and a quick‑tap menu. When users send `/wallet`, the bot prompts for a USDT
address and stores it in `bot_users.wallet_address`. Uploading a payment screenshot after `/invest` saves the image to Supabase
Storage and records the path in a `payments` table for admin review.

Create the storage bucket and table:

```
-- one‑time setup
supabase storage buckets create payment_receipts

create table payments (
  id bigint generated always as identity primary key,
  user_id bigint references bot_users(id),
  screenshot_path text,
  status text default 'pending',
  created_at timestamp with time zone default now()
);
```

Messages are followed by gentle reminders if the user stays inactive, and older prompts are auto‑deleted after a few minutes to
keep chats tidy. Admin‑only commands are guarded so regular users see a friendly “command restricted” notice.


