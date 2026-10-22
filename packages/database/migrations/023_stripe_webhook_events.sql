create table if not exists stripe_webhook_events (
  event_id text primary key,
  received_at timestamptz not null default now()
);
