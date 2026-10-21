alter table orders add column if not exists stock_released_at timestamptz;
create index if not exists orders_stock_release_idx on orders(stock_released_at) where stock_released_at is not null;
