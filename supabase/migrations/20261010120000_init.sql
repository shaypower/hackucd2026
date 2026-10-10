-- TelDeal initial schema.
-- All access goes through the server with the secret key (bypasses RLS). RLS is on everywhere with
-- no policies, so the publishable/anon key can read or write nothing.

-- ---------- Register ----------

create table public.funds (
  isin text primary key check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  name text not null,
  share_class_currencies text[] not null check (cardinality(share_class_currencies) > 0),
  cutoff_time time not null default '12:00'
);

create table public.accounts (
  account_no text primary key,
  account_name text not null
);

create table public.authorised_callers (
  id uuid primary key default gen_random_uuid(),
  account_no text not null references public.accounts (account_no) on delete cascade,
  name text not null,
  phone text not null,
  is_nominated_callback boolean not null default false
);
create index authorised_callers_account_no_idx on public.authorised_callers (account_no);
-- At most one nominated callback contact per account.
create unique index authorised_callers_one_nominated_idx
  on public.authorised_callers (account_no) where is_nominated_callback;

-- ---------- Trades ----------

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in
    ('needs_review', 'awaiting_callback', 'callback_mismatch', 'ready_to_approve', 'approved', 'rejected')),
  transcript text not null,
  extracted jsonb not null, -- ExtractedTrade (lib/types.ts)
  checks jsonb not null default '[]', -- Check[]
  created_at timestamptz not null default now()
);
create index trades_created_at_idx on public.trades (created_at desc);

create table public.callbacks (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  transcript text not null,
  extracted jsonb not null, -- ExtractedTrade
  fields jsonb not null, -- FieldDiff[]
  all_match boolean not null,
  created_at timestamptz not null default now()
);
create index callbacks_trade_id_idx on public.callbacks (trade_id, created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades (id) on delete cascade,
  actor text not null,
  type text not null check (type in
    ('trade_created', 'field_edited', 'callback_recorded', 'approved', 'rejected', 'exported')),
  payload jsonb not null default '{}',
  at timestamptz not null default now()
);
create index audit_events_trade_id_idx on public.audit_events (trade_id, at);

-- ---------- Billing ----------

create table public.subscriptions (
  desk_id text primary key,
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

-- ---------- Row level security: deny everything to anon/authenticated ----------

alter table public.funds enable row level security;
alter table public.accounts enable row level security;
alter table public.authorised_callers enable row level security;
alter table public.trades enable row level security;
alter table public.callbacks enable row level security;
alter table public.audit_events enable row level security;
alter table public.subscriptions enable row level security;

-- Least privilege: the browser-facing roles get no table access at all (the server uses the secret key).
revoke all on public.funds, public.accounts, public.authorised_callers, public.trades,
  public.callbacks, public.audit_events, public.subscriptions
  from anon, authenticated;
