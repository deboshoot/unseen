-- Run only inside BEGIN / ROLLBACK; no production files or users are retained.
insert into auth.users(id,email,raw_user_meta_data) values('c0000000-0000-4000-8000-000000000099','music-submission-fixture@example.invalid','{}');
set local role service_role;
select public.r2_reserve_upload('c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000099','music',
  '{"title":"Music fixture","artist":"UNSEEN TEST","instagram_username":"unseen.test","youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","instagram_reel_url":"https://www.instagram.com/reel/TEST123/","spotify_url":"https://open.spotify.com/track/0123456789012345678901","audio_duration_seconds":"40"}',
  '[{"id":"c0000000-0000-4000-8000-000000000010","kind":"cover","mime":"image/png","bytes":100,"key":"assets/c0000000-0000-4000-8000-000000000010/cover.png"},{"id":"c0000000-0000-4000-8000-000000000011","kind":"audio","mime":"audio/wav","bytes":100,"key":"assets/c0000000-0000-4000-8000-000000000011/audio.wav"}]');
select public.r2_complete_upload('c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000099','unseen-uploads','{"c0000000-0000-4000-8000-000000000010":"test","c0000000-0000-4000-8000-000000000011":"test"}','https://media.example');
select public.r2_complete_upload('c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000099','unseen-uploads','{}','https://media.example');
do $$ begin
  if not exists(select 1 from public.music_tracks where id='c0000000-0000-4000-8000-000000000001' and instagram_username='unseen.test' and audio_duration_seconds=40 and story='' and status='pending' and spotify_url<>'') then raise exception 'Music metadata lost'; end if;
  begin update public.music_tracks set audio_duration_seconds=40.01 where id='c0000000-0000-4000-8000-000000000001'; raise exception 'Overlong clip accepted'; exception when check_violation then null; end;
  begin update public.music_tracks set youtube_url='javascript:alert(1)' where id='c0000000-0000-4000-8000-000000000001'; raise exception 'Unsafe URL accepted'; exception when check_violation then null; end;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"c0000000-0000-4000-8000-000000000099"}',true);
update public.music_tracks set instagram_username='forged' where id='c0000000-0000-4000-8000-000000000001';
do $$ begin
  if (select instagram_username from public.music_tracks where id='c0000000-0000-4000-8000-000000000001')<>'unseen.test' then raise exception 'Owner changed moderated record'; end if;
  begin perform public.r2_complete_upload('c0000000-0000-4000-8000-000000000001',auth.uid(),'evil','{}','https://evil.example'); raise exception 'Client finalization allowed'; exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role anon;
do $$ begin if exists(select 1 from public.music_tracks where id='c0000000-0000-4000-8000-000000000001') then raise exception 'Pending music leaked'; end if; end; $$;
reset role;
set local role service_role;
insert into public.championships(id,kind,name,start_at,end_at,status) values('c0000000-0000-4000-8000-000000000020','music','Snapshot fixture',now(),now()+interval '720 hours','cancelled');
insert into public.championship_entries(championship_id,seed,track_id,title,artist,image_url,audio_url) values('c0000000-0000-4000-8000-000000000020',1,'c0000000-0000-4000-8000-000000000001','Music fixture','TEST','https://media.example/cover','https://media.example/audio');
update public.music_tracks set instagram_username='changed.after.selection' where id='c0000000-0000-4000-8000-000000000001';
do $$ begin if not exists(select 1 from public.championship_entries where championship_id='c0000000-0000-4000-8000-000000000020' and instagram_username='unseen.test' and youtube_url='https://www.youtube.com/watch?v=dQw4w9WgXcQ') then raise exception 'Championship links not frozen'; end if; end; $$;
reset role;
