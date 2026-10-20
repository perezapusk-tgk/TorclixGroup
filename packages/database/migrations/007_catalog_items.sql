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
create index if not exists catalog_items_status_idx on catalog_items(project_id,status);
