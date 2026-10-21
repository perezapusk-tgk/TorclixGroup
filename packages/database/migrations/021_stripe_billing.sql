alter table organizations add column if not exists stripe_customer_id text;
alter table organizations add column if not exists stripe_subscription_id text;
alter table organizations add column if not exists billing_status text not null default 'inactive';
create unique index if not exists organizations_stripe_customer_idx on organizations(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists organizations_stripe_subscription_idx on organizations(stripe_subscription_id) where stripe_subscription_id is not null;
