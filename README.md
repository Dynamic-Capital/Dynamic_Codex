# Telegram Dynamic Pool Bot Setup

This README provides instructions for setting up the Telegram Dynamic Pool Bot.

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

Run `npm test` to execute a small script that verifies the configuration and confirms the `bot_users` table is reachable in Supabase.

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


