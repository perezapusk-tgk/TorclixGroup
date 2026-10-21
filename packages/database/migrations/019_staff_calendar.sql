create table if not exists staff_members(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 name text not null,
 role text not null default 'staff',
 email text,
 phone text,
 status text not null default 'active',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists calendar_events(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 project_id uuid references projects(id) on delete cascade,
 staff_id uuid references staff_members(id) on delete set null,
 booking_id uuid references bookings(id) on delete set null,
 title text not null,
 start_at timestamptz not null,
 end_at timestamptz not null,
 status text not null default 'scheduled',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists staff_members_org_idx on staff_members(organization_id);
create index if not exists calendar_events_org_time_idx on calendar_events(organization_id,start_at);
create index if not exists calendar_events_project_time_idx on calendar_events(project_id,start_at);