create extension if not exists pgcrypto;

create table if not exists organizations(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,plan text not null default 'starter',created_at timestamptz not null default now());
create table if not exists users(id uuid primary key default gen_random_uuid(),external_id text unique,email text not null unique,name text not null,created_at timestamptz not null default now());
create table if not exists memberships(organization_id uuid not null references organizations(id) on delete cascade,user_id uuid not null references users(id) on delete cascade,role text not null default 'viewer',created_at timestamptz not null default now(),primary key(organization_id,user_id));
create table if not exists clients(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,name text not null,email text,created_at timestamptz not null default now());
create table if not exists projects(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,client_id uuid references clients(id) on delete set null,name text not null,type text not null,industry text not null,status text not null default 'draft',slug text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists site_documents(project_id uuid primary key references projects(id) on delete cascade,version integer not null default 1,document jsonb not null default '{"pages":[]}'::jsonb,published_document jsonb,updated_at timestamptz not null default now());
create table if not exists leads(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,project_id uuid references projects(id) on delete cascade,name text not null,email text,phone text,source text,status text not null default 'new',created_at timestamptz not null default now());
create table if not exists bookings(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,project_id uuid references projects(id) on delete cascade,customer_name text not null,customer_email text,service text,start_at timestamptz not null,status text not null default 'pending',created_at timestamptz not null default now());
create table if not exists domains(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,project_id uuid references projects(id) on delete cascade,hostname text not null unique,status text not null default 'pending',ssl_status text not null default 'pending',created_at timestamptz not null default now());
create index if not exists memberships_user_idx on memberships(user_id);
create index if not exists projects_org_idx on projects(organization_id);
create index if not exists clients_org_idx on clients(organization_id);
create index if not exists leads_org_idx on leads(organization_id);
create index if not exists bookings_org_idx on bookings(organization_id);
