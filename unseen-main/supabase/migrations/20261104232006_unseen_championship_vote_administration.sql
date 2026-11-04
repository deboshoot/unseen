-- Administrative votes have no voter account and an explicit audit note.
-- Existing row permissions keep these records visible only to administrators.
alter table public.championship_votes
  add column administration_note text
  check (administration_note is null or
    (user_id is null and length(btrim(administration_note)) between 1 and 1000));
comment on column public.championship_votes.administration_note is
  'Administrative tally correction recorded without a voter identity. Inserting the audit record does not increment match totals.';
