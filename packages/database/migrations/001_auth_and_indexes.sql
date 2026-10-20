-- TorclixGroup canonical PostgreSQL migration 001
create extension if not exists pgcrypto;

alter table users add column if not exists external_id text;
create unique index if not exists users_external_id_uidx on users(external_id) where external_id is not null;

create index if not exists memberships_user_idx on memberships(user_id);
create index if not exists projects_org_idx on projects(organization_id);
create index if not exists clients_org_idx on clients(organization_id);
create index if not exists leads_org_idx on leads(organization_id);
create index if not exists bookings_org_idx on bookings(organization_id);
