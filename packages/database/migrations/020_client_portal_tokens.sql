alter table projects add column if not exists client_portal_token text;
create unique index if not exists projects_client_portal_token_idx on projects(client_portal_token) where client_portal_token is not null;
