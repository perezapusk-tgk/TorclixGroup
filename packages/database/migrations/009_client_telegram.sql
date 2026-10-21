alter table clients add column if not exists telegram_user_id bigint;
alter table clients add column if not exists telegram_username text;
create unique index if not exists clients_org_telegram_user_idx
  on clients(organization_id,telegram_user_id)
  where telegram_user_id is not null;
