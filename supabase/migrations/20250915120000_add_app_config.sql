-- BEGIN CONFIG-HUB
create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_by bigint,
  updated_at timestamptz default now()
);

-- seed default keys if absent
insert into app_config (key, value)
  values
    ('welcome_copy', to_jsonb('Welcome to the Dynamic Pool Bot!'::text)),
    ('help_copy', to_jsonb('Send /start to begin.'::text)),
    ('vip_chat_id', to_jsonb(''::text)),
    ('plans', '[]'::jsonb),
    ('links', '{"support_url":"https://t.me/DynamicCapital_Support"}'::jsonb),
    ('flags', '{"miniapp_config_enabled":false}'::jsonb)
  on conflict (key) do nothing;

create view if not exists app_config_version as
  select max(updated_at) as version from app_config;

create or replace function get_app_config()
returns json as $$
  select json_build_object(
    'version', (select version from app_config_version),
    'data', coalesce(json_object_agg(key, value), '{}'::json)
  )
  from app_config;
$$ language sql stable;
-- END CONFIG-HUB
