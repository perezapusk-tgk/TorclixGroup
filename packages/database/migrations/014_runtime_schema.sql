-- Canonical schema additions used by the production runtime.
create table if not exists catalog_items(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  slug text not null,
  item_type text not null default 'service',
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  category text,
  status text not null default 'active',
  stock integer,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,slug)
);
create index if not exists catalog_items_org_idx on catalog_items(organization_id);
create index if not exists catalog_items_project_idx on catalog_items(project_id);

create table if not exists orders(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  customer_id uuid references clients(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  status text not null default 'pending',
  currency text not null default 'EUR',
  total numeric(12,2) not null default 0,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stock_released_at timestamptz
);
create table if not exists order_items(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  catalog_item_id uuid references catalog_items(id) on delete set null,
  name text not null,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);
create index if not exists orders_org_idx on orders(organization_id,created_at desc);
create index if not exists orders_project_idx on orders(project_id,created_at desc);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists torclix_schema_migrations(
  id text primary key,
  applied_at timestamptz not null default now()
);
