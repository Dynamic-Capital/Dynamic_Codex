# Telegram Dynamic Pool Bot Setup

This README provides instructions for setting up the Telegram Dynamic Pool Bot.

## Option 2: GitHub → Supabase Sync Only

If you're using Codex with GitHub and Supabase, Deno doesn't need to be installed locally.

- Make code edits directly in GitHub or Codex.
- Push changes to `supabase/functions/telegram-bot/index.ts`.
- Supabase deploys Edge Functions automatically through GitHub Actions.

This approach works from any device and avoids a local Deno setup. Expect a short delay of roughly 5–10 seconds for GitHub to Supabase synchronization.

## Command Map

### Users
- `/start`
- `/register`
- `/wallet`
- `/invest`
- `/myshares`
- `/report`
- `/withdraw`
- `/support`
- `/help`

### Admins
- `/admin`
- `/listusers`
- `/approve`
- `/distribute`
- `/sendreport`
- `/broadcast`
- `/listinvestments`
- `/toggleaccess`


