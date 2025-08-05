-- Core tables for the Telegram bot

-- Registered bot users
create table if not exists bot_users (
  id bigint primary key,
  username text,
  first_name text,
  wallet_address text,
  created_at timestamptz default now()
);
alter table bot_users enable row level security;
-- Only allow service role or matching user id
create policy "bot_users_self" on bot_users
  for all using (auth.uid()::bigint = id) with check (auth.uid()::bigint = id);

-- Custom command responses set by admins
create table if not exists bot_commands (
  command text primary key,
  response text not null
);
alter table bot_commands enable row level security;
create policy "bot_commands_service" on bot_commands
  for all using (true) with check (true);

-- Uploaded payment screenshots and metadata
create table if not exists payments (
  id bigserial primary key,
  user_id bigint references bot_users(id),
  amount numeric,
  txid text,
  screenshot_path text,
  status text default 'pending',
  created_at timestamptz default now()
);
alter table payments enable row level security;
create policy "payments_self_select" on payments
  for select using (auth.uid()::bigint = user_id);
create policy "payments_self_insert" on payments
  for insert with check (auth.uid()::bigint = user_id);
create policy "payments_service" on payments
  for all using (true) with check (true);

-- Logged messages
create table if not exists messages (
  id bigserial primary key,
  user_id bigint,
  username text,
  text text,
  date timestamptz default now()
);
alter table messages enable row level security;
create policy "messages_service" on messages
  for all using (true) with check (true);

-- Storage bucket for payment receipts
-- Run once: supabase storage buckets create payment_receipts
