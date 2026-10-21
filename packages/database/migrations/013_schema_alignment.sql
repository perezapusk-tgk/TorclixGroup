-- Keep canonical schema aligned with post-foundation runtime fields and indexes.
alter table if exists clients add column if not exists telegram_user_id bigint;
alter table if exists clients add column if not exists telegram_username text;
alter table if exists leads add column if not exists telegram_user_id bigint;
alter table if exists leads add column if not exists telegram_username text;
alter table if exists orders add column if not exists stock_released_at timestamptz;
create unique index if not exists clients_org_telegram_user_idx on clients(organization_id,telegram_user_id) where telegram_user_id is not null;
create index if not exists leads_org_telegram_user_idx on leads(organization_id,telegram_user_id) where telegram_user_id is not null;
create index if not exists bookings_org_telegram_user_idx on bookings(organization_id,telegram_user_id) where telegram_user_id is not null;
create index if not exists orders_stock_release_idx on orders(stock_released_at) where stock_released_at is not null;
