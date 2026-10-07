-- Keep expired upload reservations in the rolling 24-hour quota. Garbage
-- collection removes files immediately, but quota evidence is retained 30 days.
alter table public.r2_uploads drop constraint r2_uploads_state_check;
alter table public.r2_uploads add constraint r2_uploads_state_check check(state in ('prepared','complete','expired'));
