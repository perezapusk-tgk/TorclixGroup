alter table domains add column if not exists verification_token text;
alter table domains add column if not exists verified_at timestamptz;
create unique index if not exists domains_verification_token_idx on domains(verification_token) where verification_token is not null;
