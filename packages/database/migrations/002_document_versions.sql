-- Published/draft document history for deterministic releases
create table if not exists site_document_versions(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version integer not null,
  document jsonb not null,
  created_at timestamptz not null default now(),
  unique(project_id,version)
);
create index if not exists site_document_versions_project_idx on site_document_versions(project_id,version desc);

alter table site_documents add column if not exists published_version integer;


alter table domains add column if not exists verification_token text;
alter table domains add column if not exists verified_at timestamptz;
create unique index if not exists domains_hostname_unique_idx on domains(hostname);
