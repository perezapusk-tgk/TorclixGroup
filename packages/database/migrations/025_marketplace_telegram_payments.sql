alter table orders add column if not exists payment_provider text;
alter table orders add column if not exists payment_invoice_url text;
alter table orders add column if not exists payment_payload text;
alter table orders add column if not exists commission_rate numeric(6,3) not null default 5;
alter table orders add column if not exists commission_amount numeric(12,2) not null default 0;
alter table orders add column if not exists seller_amount numeric(12,2) not null default 0;
alter table orders add column if not exists telegram_payment_charge_id text;
create index if not exists orders_payment_charge_idx on orders(telegram_payment_charge_id) where telegram_payment_charge_id is not null;
