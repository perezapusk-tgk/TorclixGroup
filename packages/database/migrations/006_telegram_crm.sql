alter table bookings add column if not exists customer_phone text;
alter table bookings add column if not exists telegram_user_id bigint;
alter table bookings add column if not exists telegram_username text;

create table if not exists telegram_integrations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  bot_id bigint,
  bot_username text,
  enabled boolean not null default true,
  webhook_url text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, project_id)
);

create index if not exists telegram_integrations_org_idx on telegram_integrations(organization_id);
