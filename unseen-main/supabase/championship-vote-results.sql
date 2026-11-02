-- Apply after championship-control-room.sql.
-- Reveal percentages only after the caller has voted in that specific match.
-- Raw live tallies and direct table permissions remain unchanged.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';

create or replace function public.get_championship(p_kind text,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid; ts timestamptz; admin boolean:=public.is_unseen_admin();
begin
  select id into cid from public.championships where kind=p_kind and (p_id is null or id=p_id)
    order by case when status in ('scheduled','running') then 0 else 1 end,start_at desc limit 1;
  if cid is null then return jsonb_build_object('server_now',clock_timestamp(),'championship',null,'entries','[]'::jsonb,'matches','[]'::jsonb,'my_votes','[]'::jsonb); end if;
  perform 1 from public.championships where id=cid for update;
  ts:=clock_timestamp();
  perform unseen_private.advance_championship(cid,ts);
  return jsonb_build_object('server_now',clock_timestamp(),
    'championship',(select to_jsonb(c) from public.championships c where id=cid),
    'entries',(select jsonb_agg(e order by e.seed) from public.championship_entries e where e.championship_id=cid),
    'matches',(select jsonb_agg(
      (to_jsonb(m)-'votes_1'-'votes_2')||jsonb_build_object(
        'votes_1',case when admin or m.resolved_at is not null then m.votes_1 else null end,
        'votes_2',case when admin or m.resolved_at is not null then m.votes_2 else null end,
        'results_available',m.resolved_at is not null,
        'vote_percentages',case when m.resolved_at is not null or exists(
          select 1 from public.championship_votes v where v.match_id=m.id and v.user_id=auth.uid()
        ) then jsonb_build_object(
          'leading_slot',case when m.votes_1>m.votes_2 then 1 when m.votes_2>m.votes_1 then 2 else null end,
          'slot_1',case when m.votes_1::numeric+m.votes_2=0 then 0
            else round(100.0*m.votes_1/(m.votes_1::numeric+m.votes_2)) end,
          'slot_2',case when m.votes_1::numeric+m.votes_2=0 then 0
            else 100-round(100.0*m.votes_1/(m.votes_1::numeric+m.votes_2)) end
        ) else null end)
      order by m.number) from public.championship_matches m where m.championship_id=cid),
    'my_votes',coalesce((select jsonb_agg(jsonb_build_object('match_id',v.match_id,'vote_slot',v.vote_slot))
      from public.championship_votes v join public.championship_matches m on m.id=v.match_id
      where m.championship_id=cid and v.user_id=auth.uid()),'[]'::jsonb));
end; $$;
revoke all on function public.get_championship(text,uuid) from public;
grant execute on function public.get_championship(text,uuid) to anon,authenticated;
commit;
