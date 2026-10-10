-- Audit event: a dealer accepted a name difference (fund / account name / speaker) on a callback.
alter table public.audit_events drop constraint audit_events_type_check;
alter table public.audit_events add constraint audit_events_type_check check (type in
  ('trade_created', 'field_edited', 'callback_recorded', 'callback_call', 'callback_field_accepted', 'approved', 'rejected', 'exported'));
