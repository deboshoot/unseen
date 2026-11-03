-- Three required arguments keep existing two-argument clients compatible.
create or replace function public.get_admin_community(p_users_page integer,p_voters_page integer,p_search text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; term text:=lower(btrim(coalesce(p_search,'')));
begin
  if not public.is_unseen_admin() then raise exception 'Administrator required'; end if;
  if p_users_page not between 0 and 100000 or p_voters_page not between 0 and 100000 or p_users_page is null or p_voters_page is null then raise exception 'Invalid page'; end if;
  if length(term)>320 then raise exception 'Search too long'; end if;
  if term='' then return public.get_admin_community(p_users_page,p_voters_page); end if;
  with matching_profiles as (
    select id,email,created_at from public.profiles where strpos(lower(email),term)>0
  ), all_votes as (
    select v.user_id,v.created_at from public.votes v join matching_profiles p on p.id=v.user_id
    union all select v.user_id,v.created_at from public.final_arena_votes v join matching_profiles p on p.id=v.user_id
    union all select v.user_id,v.created_at from public.music_votes v join matching_profiles p on p.id=v.user_id
    union all select v.user_id,v.created_at from public.championship_votes v join matching_profiles p on p.id=v.user_id
  ), voter_totals as (
    select user_id,count(*) as "voteCount",max(created_at) as "lastVoteAt" from all_votes group by user_id
  ), voter_page as (
    select p.id,p.email,p.created_at,v."voteCount",v."lastVoteAt" from voter_totals v join matching_profiles p on p.id=v.user_id order by v."lastVoteAt" desc,p.id limit 100 offset p_voters_page*100
  ), user_page as (
    select id,email,created_at from matching_profiles order by created_at desc,id limit 100 offset p_users_page*100
  ) select jsonb_build_object(
    'stats',jsonb_build_object('users',(select count(*) from matching_profiles),'opere',(select count(*) from public.opere)+(select count(*) from public.music_tracks),'votes',(select count(*) from all_votes),'voters',(select count(*) from voter_totals)),
    'users',coalesce((select jsonb_agg(u order by u.created_at desc,u.id) from user_page u),'[]'::jsonb),
    'voters',coalesce((select jsonb_agg(v order by v."lastVoteAt" desc,v.id) from voter_page v),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_admin_community(integer,integer,text) from public,anon,authenticated;
grant execute on function public.get_admin_community(integer,integer,text) to authenticated;
notify pgrst, 'reload schema';
