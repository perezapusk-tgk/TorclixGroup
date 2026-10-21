create table if not exists site_events(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 project_id uuid not null,
 session_id text not null,
 type text not null,
 path text not null default '/',
 referrer text,
 created_at timestamptz not null default now()
);
create index if not exists site_events_org_time_idx on site_events(organization_id,created_at desc);
create index if not exists site_events_project_time_idx on site_events(project_id,created_at desc);

create table if not exists audit_log(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 actor_id text,
 actor_role text,
 action text not null,
 entity_type text,
 entity_id text,
 meta jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_log_org_time_idx on audit_log(organization_id,created_at desc);
