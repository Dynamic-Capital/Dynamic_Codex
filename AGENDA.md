# Project Agenda & Operating Rules
Personal project — single maintainer, occasional collaborators welcome.

## Purpose
Ship a reliable, configurable Telegram bot + Mini App with bank/crypto verification and zero hardcoded business logic.

## Rules of engagement
Reuse first; extend, don’t duplicate.

No secrets in code; use Codex/GitHub/Supabase secrets.

Config in DB via Config Hub (app_config).

Migrations are append-only.

Verify before merge.

## Change workflow
Branch → small PR → CI green → merge

Risky changes: deploy to staging first (GitHub Environments)

ChatOps /deploy staging from admin TG if configured

## Weekly rhythm (suggested)
Mon/Tue: features & refactors

Wed: OCR/auto-verify tuning, metrics

Thu: docs, DX polish, deps

Fri: release (deploy → verify → announce)

## Current priorities
- [ ] Full Config Hub adoption in handlers
- [ ] Bank CSV/email parsers for my bank
- [ ] Crypto watcher tuning (confirmations, retries)
- [ ] Mini App: Status + Admin “Config” tab (gated)
- [ ] Secrets sync manifest + nightly verify in CI

## Backlog
- [ ] OCR human-in-the-loop
- [ ] Golden receipt test set
- [ ] Vendor failover (Vision ↔ OCR.space ↔ Tesseract)
- [ ] Bundle size budget + visualizer in CI

## What to edit vs not (cheat sheet)
Edit: /apps/webapp/**, packages/**, supabase/functions/**, supabase/migrations/0xx_*.sql (new only)
Don’t: touch applied migrations, hardcode prices/IDs/copy, duplicate workflows/scripts/functions, commit .env or secrets

## Health checklist
- npm run check:secrets
- npm run verify:functions
- npm run check:connect
- (optional) npm run check:certs

## Rollback plan
Revert merge commit in GitHub → rerun Deploy workflow

Reset Telegram webhook (see README)

If DB change caused issues, revert code first; DB migrations remain append-only

## Contacts
Admin TG: @Dynamic_Capital_Admin

Support TG: @DynamicCapital_Support

Bot: @Dynamic_CODEX_BOT
