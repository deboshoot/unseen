$ErrorActionPreference='Stop'
$appDirectory=Split-Path -Parent $PSScriptRoot
$auditDirectory=Join-Path (Split-Path -Parent $appDirectory) 'debug.local/supabase-audit'
$credentials=@{}
foreach($line in (Get-Content -LiteralPath (Join-Path $appDirectory '.env.supabase.local'))) {
  if($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { $credentials[$Matches[1]]=$Matches[2].Trim().Trim('"').Trim("'") }
}
if($credentials['SUPABASE_PROJECT_REF'] -ne 'mpqphroecgfwonclmkyb' -or !$credentials['SUPABASE_ACCESS_TOKEN']) { throw 'Progetto o token non valido.' }
$headers=@{Authorization='Bearer '+$credentials['SUPABASE_ACCESS_TOKEN']}
$query=@'
select jsonb_build_object(
 'already_migrated',to_regclass('unseen_private.admin_accounts') is not null,
 'policies',(select jsonb_agg(to_jsonb(t)) from (select * from pg_policies where (schemaname='public' and tablename in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months')) or (schemaname='storage' and tablename='objects')) t),
 'functions',(select jsonb_agg(to_jsonb(t)) from (
   select p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('cast_vote','cast_final_arena_vote','start_duel_logic','start_duel_timer','handle_new_user','activate_scheduled_duel')
 ) t),
 'function_grants',(select jsonb_agg(to_jsonb(t)) from (
   select p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,
     case when a.grantee=0 then 'PUBLIC' else r.rolname end as grantee,a.privilege_type,a.is_grantable
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee
   where n.nspname='public' and p.proname in ('cast_vote','cast_final_arena_vote','start_duel_logic','start_duel_timer','handle_new_user','activate_scheduled_duel') and (a.grantee=0 or r.rolname in ('anon','authenticated'))
 ) t),
 'table_grants',(select jsonb_agg(to_jsonb(t)) from (
   select c.relname as table_name,r.rolname as grantee,a.privilege_type,a.is_grantable
   from pg_class c join pg_namespace n on n.oid=c.relnamespace
   cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a join pg_roles r on r.oid=a.grantee
   where n.nspname='public' and c.relname in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months') and r.rolname in ('anon','authenticated')
 ) t),
 'indexes',(select jsonb_agg(to_jsonb(t)) from (select tablename,indexname,indexdef from pg_indexes where schemaname='public') t),
 'bucket',(select jsonb_build_object('file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) from storage.buckets where id='galleria')
) as snapshot;
'@
function Quote-Identifier([string]$Value) { '"'+$Value.Replace('"','""')+'"' }
function Quote-Literal([string]$Value) { "'"+$Value.Replace("'","''")+"'" }
function Format-Role([string]$Value) { if($Value -in @('public','PUBLIC')) { 'PUBLIC' } else { Quote-Identifier $Value } }
try {
  $body=@{query=$query}|ConvertTo-Json -Compress
  $result=Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/mpqphroecgfwonclmkyb/database/query/read-only' -Headers $headers -Method Post -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
  $snapshot=$result[0].snapshot
  if($snapshot.already_migrated) { throw 'Migrazione gia applicata: il backup originale non verra sovrascritto.' }
  $snapshot|ConvertTo-Json -Depth 25|Set-Content -LiteralPath (Join-Path $auditDirectory 'before-hardening.json') -Encoding UTF8
  $sql=[Collections.Generic.List[string]]::new()
  $sql.Add('-- Restore the pre-migration configuration; no existing user/media rows are deleted.')
  $sql.Add('set local lock_timeout=''5s'';')
  $sql.Add(@'
do $$ declare item record; begin
for item in select schemaname,tablename,policyname from pg_policies
 where (schemaname='public' and tablename in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months')) or (schemaname='storage' and tablename='objects')
loop execute format('drop policy %I on %I.%I',item.policyname,item.schemaname,item.tablename); end loop;
end $$;
'@)
  foreach($policy in $snapshot.policies) {
    $roles=($policy.roles|ForEach-Object { Format-Role $_ }) -join ','
    $statement='create policy '+(Quote-Identifier $policy.policyname)+' on '+(Quote-Identifier $policy.schemaname)+'.'+(Quote-Identifier $policy.tablename)+' as '+$policy.permissive+' for '+$policy.cmd+' to '+$roles
    if($policy.qual) { $statement+=' using ('+$policy.qual+')' }
    if($policy.with_check) { $statement+=' with check ('+$policy.with_check+')' }
    $sql.Add($statement+';')
  }
  $sql.Add('revoke all on public.opere,public.profiles,public.duels,public.votes,public.final_arenas,public.final_arena_votes,public.gallery_months from anon,authenticated;')
  foreach($grant in $snapshot.table_grants) {
    $statement='grant '+$grant.privilege_type+' on public.'+(Quote-Identifier $grant.table_name)+' to '+(Format-Role $grant.grantee)
    if($grant.is_grantable) { $statement+=' with grant option' }
    $sql.Add($statement+';')
  }
  foreach($function in $snapshot.functions) {
    $sql.Add($function.definition+';')
    $sql.Add('revoke all on function public.'+(Quote-Identifier $function.name)+'('+$function.arguments+') from public,anon,authenticated;')
  }
  foreach($grant in $snapshot.function_grants) {
    $statement='grant '+$grant.privilege_type+' on function public.'+(Quote-Identifier $grant.name)+'('+$grant.arguments+') to '+(Format-Role $grant.grantee)
    if($grant.is_grantable) { $statement+=' with grant option' }
    $sql.Add($statement+';')
  }
  $mimeSql='NULL'
  if($null -ne $snapshot.bucket.allowed_mime_types) { $mimeSql='ARRAY['+(($snapshot.bucket.allowed_mime_types|ForEach-Object { Quote-Literal $_ }) -join ',')+']' }
  $sizeSql='NULL'
  if($null -ne $snapshot.bucket.file_size_limit) { $sizeSql=[string]$snapshot.bucket.file_size_limit }
  $sql.Add("update storage.buckets set file_size_limit=$sizeSql,allowed_mime_types=$mimeSql where id='galleria';")
  foreach($index in $snapshot.indexes) { $sql.Add(($index.indexdef -replace '^CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ' -replace '^CREATE INDEX ','CREATE INDEX IF NOT EXISTS ')+';') }
  foreach($indexName in @('votes_duel_id_idx','opere_status_created_at_idx')) {
    if($snapshot.indexes.indexname -notcontains $indexName) { $sql.Add('drop index if exists public.'+(Quote-Identifier $indexName)+';') }
  }
  $sql.Add('drop function public.is_unseen_admin();')
  $sql.Add('drop table unseen_private.admin_accounts;')
  $sql.Add('drop schema unseen_private;')
  [IO.File]::WriteAllText((Join-Path $auditDirectory 'rollback-access-hardening.sql'),($sql -join "`n"),[Text.UTF8Encoding]::new($false))
  Write-Output 'Configurazione originale e SQL di rollback salvati nella cartella locale esclusa da Git.'
} finally { $headers.Clear();$credentials.Clear() }
