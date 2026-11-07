-- Rehearsal only. The caller MUST wrap the entire file in BEGIN ... ROLLBACK.
insert into auth.users(id,email,raw_user_meta_data) values('d0000000-0000-4000-8000-000000000099','capacity-test@example.invalid','{}');
set local role service_role;
select public.r2_reserve_upload('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000099','photo','{}','[{"bytes":100}]');
do $$ begin
  if not exists(select 1 from public.r2_uploads where id='d0000000-0000-4000-8000-000000000001') then raise exception 'Ordinary upload rejected'; end if;
  begin perform public.r2_reserve_upload(gen_random_uuid(),'d0000000-0000-4000-8000-000000000099','photo','{}','[{"bytes":0}]');
    raise exception 'Zero size accepted'; exception when raise_exception then if sqlerrm<>'Invalid file size' then raise; end if; end;
end; $$;
reset role;
-- Large prepared sessions consume the safety budget without touching real files.
insert into public.r2_uploads(id,user_id,kind,metadata,files,total_bytes,created_at)
select gen_random_uuid(),'d0000000-0000-4000-8000-000000000099','music','{}','[]',36700160,now()-interval '25 hours' from generate_series(1,80);
set local role service_role;
do $$ begin
  begin perform public.r2_reserve_upload(gen_random_uuid(),'d0000000-0000-4000-8000-000000000099','photo','{}','[{"bytes":100}]');
    raise exception 'Capacity limit bypassed'; exception when raise_exception then if sqlerrm not like 'Spazio media quasi esaurito:%' then raise; end if; end;
end; $$;
reset role;
-- Remove only transaction-local fixtures, then exercise the global daily cap.
delete from public.r2_uploads where user_id='d0000000-0000-4000-8000-000000000099' and created_at<now()-interval '24 hours';
insert into public.r2_uploads(id,user_id,kind,metadata,files,total_bytes,state)
select gen_random_uuid(),'d0000000-0000-4000-8000-000000000099','photo','{}','[]',1,'expired' from generate_series(1,500);
select set_config('request.jwt.claims','{"role":"authenticated","sub":"d0000000-0000-4000-8000-000000000099"}',true);
set local role authenticated;
do $$ begin
  begin perform public.r2_reserve_upload(gen_random_uuid(),auth.uid(),'photo','{}','[{"bytes":100}]');
    raise exception 'Client reserved directly'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('d0000000-0000-4000-8000-000000000098','capacity-other-test@example.invalid','{}');
set local role service_role;
do $$ begin
  begin perform public.r2_reserve_upload(gen_random_uuid(),'d0000000-0000-4000-8000-000000000098','photo','{}','[{"bytes":100}]');
    raise exception 'Global daily limit bypassed'; exception when raise_exception then if sqlerrm not like 'Limite giornaliero globale%' then raise; end if; end;
end; $$;
reset role;
