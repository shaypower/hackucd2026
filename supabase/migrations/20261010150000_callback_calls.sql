-- Automated callback calls: one row per outbound call, holding the conversation between turns.
create table public.callback_calls (
  call_sid text primary key,
  trade_id uuid not null references public.trades (id) on delete cascade,
  to_number text not null,
  transcript text not null default '', -- "Agent: ...\nCaller: ..." lines
  turns int not null default 0,
  silent_turns int not null default 0,
  outcome text check (outcome in ('matched', 'mismatched', 'incomplete', 'no_answer', 'failed')),
  created_at timestamptz not null default now()
);
create index callback_calls_trade_id_idx on public.callback_calls (trade_id, created_at desc);
alter table public.callback_calls enable row level security;
revoke all on public.callback_calls from anon, authenticated;

-- New audit event for placing / ending an automated callback call.
alter table public.audit_events drop constraint audit_events_type_check;
alter table public.audit_events add constraint audit_events_type_check check (type in
  ('trade_created', 'field_edited', 'callback_recorded', 'callback_call', 'approved', 'rejected', 'exported'));
