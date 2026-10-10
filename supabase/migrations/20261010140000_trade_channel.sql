-- Where an instruction came from: typed/pasted on the desk, or a call to the TelDeal phone line.
alter table public.trades
  add column channel text not null default 'desk' check (channel in ('desk', 'phone')),
  add column caller_id text, -- phone number the call came from (caller ID can be spoofed: informational only)
  add column recording_sid text; -- Twilio recording, played back through /api/trades/[id]/recording

create index trades_channel_created_at_idx on public.trades (channel, created_at desc);
