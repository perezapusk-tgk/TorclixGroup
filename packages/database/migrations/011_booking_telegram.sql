alter table bookings add column if not exists telegram_user_id bigint;
alter table bookings add column if not exists telegram_username text;
create index if not exists bookings_org_telegram_user_idx on bookings(organization_id,telegram_user_id) where telegram_user_id is not null;
