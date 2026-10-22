-- TorclixGroup PostgreSQL foundation
-- Designed for multi-tenant studio operations.

create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'starter',
  created_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  external_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  type text not null,
  industry text not null,
  status text not null default 'draft',
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists site_documents (
  project_id uuid primary key references projects(id) on delete cascade,
  version integer not null default 1,
  document jsonb not null default '{"pages":[]}'::jsonb,
  published_document jsonb,
  published_version integer,
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  telegram_user_id bigint,
  telegram_username text,
  service text,
  start_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  hostname text not null unique,
  status text not null default 'pending',
  ssl_status text not null default 'pending',
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists projects_org_idx on projects(organization_id);
create index if not exists clients_org_idx on clients(organization_id);
create index if not exists leads_project_idx on leads(project_id);
create index if not exists bookings_project_idx on bookings(project_id);


create table if not exists site_document_versions(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version integer not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  unique(project_id,version)
);

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


-- Runtime catalog and orders schema.
create table if not exists catalog_items(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade, name text not null, slug text not null,
  item_type text not null default 'service', description text, price numeric(12,2) not null default 0,
  currency text not null default 'EUR', category text, status text not null default 'active', stock integer, image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,slug)
);
create table if not exists orders(
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade, customer_id uuid references clients(id) on delete set null,
  customer_name text not null, customer_email text, customer_phone text, status text not null default 'pending',
  currency text not null default 'EUR', total numeric(12,2) not null default 0, source text not null default 'website',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), stock_released_at timestamptz
);
create table if not exists order_items(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  catalog_item_id uuid references catalog_items(id) on delete set null, name text not null, quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0, total numeric(12,2) not null default 0
);
create index if not exists catalog_items_org_idx on catalog_items(organization_id);
create index if not exists catalog_items_project_idx on catalog_items(project_id);
create index if not exists orders_org_idx on orders(organization_id,created_at desc);
create index if not exists orders_project_idx on orders(project_id,created_at desc);
create index if not exists order_items_order_idx on order_items(order_id);
