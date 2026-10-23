do $$ begin
  if exists(select 1 from information_schema.columns where table_name='organizations' and column_name='stripe_customer_id')
     and not exists(select 1 from information_schema.columns where table_name='organizations' and column_name='yookassa_customer_id')
  then alter table organizations rename column stripe_customer_id to yookassa_customer_id; end if;
  if exists(select 1 from information_schema.columns where table_name='organizations' and column_name='stripe_subscription_id')
     and not exists(select 1 from information_schema.columns where table_name='organizations' and column_name='yookassa_payment_id')
  then alter table organizations rename column stripe_subscription_id to yookassa_payment_id; end if;
end $$;
drop index if exists organizations_stripe_customer_idx;
drop index if exists organizations_stripe_subscription_idx;
create unique index if not exists organizations_yookassa_customer_idx on organizations(yookassa_customer_id) where yookassa_customer_id is not null;
create unique index if not exists organizations_yookassa_payment_idx on organizations(yookassa_payment_id) where yookassa_payment_id is not null;
alter table organizations add column if not exists yookassa_customer_id text;
alter table organizations add column if not exists yookassa_payment_id text;
create table if not exists yookassa_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);
insert into yookassa_webhook_events(event_id,received_at)
select event_id,received_at from stripe_webhook_events
on conflict(event_id) do nothing;
drop table if exists stripe_webhook_events;