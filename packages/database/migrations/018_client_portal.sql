alter table projects add column if not exists client_portal_status text not null default 'draft';
alter table projects add column if not exists client_portal_note text;
alter table projects add column if not exists client_portal_updated_at timestamptz;
create index if not exists projects_client_portal_status_idx on projects(organization_id,client_portal_status);
