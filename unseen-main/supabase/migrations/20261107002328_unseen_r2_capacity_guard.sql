-- Conservative admission limits for the R2 free allowance. Existing reads and
-- voting are unaffected. Copies, unfinished uploads and deletion backlogs count.
create or replace function public.r2_reserve_upload(p_id uuid,p_user_id uuid,p_kind text,p_metadata jsonb,p_files jsonb)
returns void language plpgsql set search_path='' as $$
declare total bigint; reserved bigint;
begin
  -- Global serialization prevents simultaneous users from overbooking capacity.
  perform pg_advisory_xact_lock(741205,1);
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,783));
  if (select count(*) from public.r2_uploads where user_id=p_user_id and created_at>=now()-interval '24 hours')>=5 then
    raise exception 'Limite giornaliero raggiunto: riprova domani.';
  end if;
  if (select count(*) from public.r2_uploads where created_at>=now()-interval '24 hours')>=500 then
    raise exception 'Limite giornaliero globale raggiunto: nuovi invii temporaneamente sospesi. Galleria e voti restano disponibili.';
  end if;
  select sum((f->>'bytes')::bigint) into total from jsonb_array_elements(p_files) f;
  if p_kind not in ('photo','music') or jsonb_array_length(p_files)<>(case when p_kind='photo' then 1 else 2 end) then raise exception 'Invalid files'; end if;
  if total is null or total not between 1 and 36700160 then raise exception 'Invalid file size'; end if;
  select
    coalesce((select sum(bytes)*2 from public.media_assets),0) +
    coalesce((select sum(total_bytes)*3 from public.r2_uploads where state='prepared'),0) +
    coalesce((select sum(total_bytes) from public.r2_uploads where state='complete' and created_at>=now()-interval '48 hours'),0) +
    (select count(*)*31457280 from public.r2_delete_jobs)
  into reserved;
  -- 8 decimal GB leaves headroom inside R2's 10 GB allowance. Each new
  -- reservation budgets incoming + frozen + potential publication copies.
  if reserved+total*3>8000000000 then
    raise exception 'Spazio media quasi esaurito: nuovi invii temporaneamente sospesi. Galleria e voti restano disponibili.';
  end if;
  insert into public.r2_uploads(id,user_id,kind,metadata,files,total_bytes) values(p_id,p_user_id,p_kind,p_metadata,p_files,total);
end; $$;
revoke all on function public.r2_reserve_upload(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.r2_reserve_upload(uuid,uuid,text,jsonb,jsonb) to service_role;
