create table if not exists invoices(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 project_id uuid references projects(id) on delete set null,
 client_id uuid references clients(id) on delete set null,
 number text not null,
 status text not null default 'draft',
 currency text not null default 'EUR',
 subtotal numeric(12,2) not null default 0,
 tax numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0,
 due_at timestamptz,
 paid_at timestamptz,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,number)
);
create table if not exists invoice_items(
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references invoices(id) on delete cascade,
 description text not null,
 quantity numeric(12,2) not null default 1,
 unit_price numeric(12,2) not null default 0,
 total numeric(12,2) not null default 0
);
create index if not exists invoices_org_idx on invoices(organization_id,created_at desc);
create index if not exists invoice_items_invoice_idx on invoice_items(invoice_id);