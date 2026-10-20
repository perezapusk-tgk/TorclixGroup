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
