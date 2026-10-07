param(
    [ValidateSet('schema', 'storage', 'security', 'performance', 'disk', 'counts', 'details')]
    [string]$Section = 'schema'
)

$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path -Parent $PSScriptRoot
$credentialsPath = Join-Path $appDirectory '.env.supabase.local'
$auditDirectory = Join-Path (Split-Path -Parent $appDirectory) 'debug.local/supabase-audit'
$expectedProject = 'mpqphroecgfwonclmkyb'
$credentials = @{}
foreach ($line in (Get-Content -LiteralPath $credentialsPath)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
        $credentials[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
}
if (!$credentials['SUPABASE_ACCESS_TOKEN']) { throw 'Token Supabase locale non compilato.' }
if ($credentials['SUPABASE_PROJECT_REF'] -ne $expectedProject) { throw 'Progetto diverso da quello autorizzato.' }
$headers = @{ Authorization = 'Bearer ' + $credentials['SUPABASE_ACCESS_TOKEN'] }
$apiRoot = "https://api.supabase.com/v1/projects/$expectedProject"

function Invoke-AuditQuery([string]$Query) {
    $body = @{ query = $Query } | ConvertTo-Json -Compress
    # Endpoint dedicato: la query gira con il ruolo Supabase di sola lettura.
    Invoke-RestMethod -Uri "$apiRoot/database/query/read-only" -Headers $headers -Method Post -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
}

try {
    $result = switch ($Section) {
        'schema' {
            Invoke-AuditQuery @'
select jsonb_build_object(
  'database_bytes', pg_database_size(current_database()),
  'public_relations_bytes', (select coalesce(sum(pg_total_relation_size(c.oid)),0) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','m')),
  'tables', (select coalesce(jsonb_agg(to_jsonb(t) order by t.table_name),'[]'::jsonb) from (
    select c.relname as table_name, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls,
      pg_total_relation_size(c.oid) as total_bytes, pg_relation_size(c.oid) as table_bytes,
      pg_indexes_size(c.oid) as indexes_bytes, coalesce(s.n_live_tup,0) as estimated_rows
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    left join pg_stat_user_tables s on s.relid=c.oid
    where n.nspname='public' and c.relkind='r'
  ) t),
  'columns', (select coalesce(jsonb_agg(to_jsonb(t) order by t.table_name,t.ordinal_position),'[]'::jsonb) from (
    select table_name,column_name,data_type,is_nullable,column_default,ordinal_position
    from information_schema.columns where table_schema='public'
  ) t),
  'indexes', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select tablename,indexname,indexdef from pg_indexes where schemaname='public'
  ) t),
  'constraints', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select c.relname as table_name, con.conname, con.contype, pg_get_constraintdef(con.oid) as definition
    from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  ) t),
  'policies', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
    from pg_policies where schemaname in ('public','storage')
  ) t),
  'functions', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as arguments,
      p.prosecdef as security_definer, p.proconfig as configuration,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
  ) t),
  'extensions', (select coalesce(jsonb_agg(extname),'[]'::jsonb) from pg_extension)
) as audit;
'@
        }
        'storage' {
            Invoke-AuditQuery @'
select jsonb_build_object(
  'buckets', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select id,name,public,file_size_limit,allowed_mime_types from storage.buckets
  ) t),
  'usage', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select bucket_id,count(*) as object_count,
      sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end) as stored_bytes,
      max(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end) as largest_object_bytes,
      min(created_at) as oldest_object_at,max(created_at) as newest_object_at
    from storage.objects group by bucket_id
  ) t),
  'formats', (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
    select bucket_id,metadata->>'mimetype' as mime_type,count(*) as object_count,
      sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end) as stored_bytes
    from storage.objects group by bucket_id,metadata->>'mimetype'
  ) t)
) as audit;
'@
        }
        'security' { Invoke-RestMethod -Uri "$apiRoot/advisors/security" -Headers $headers -Method Get -TimeoutSec 60 }
        'performance' { Invoke-RestMethod -Uri "$apiRoot/advisors/performance" -Headers $headers -Method Get -TimeoutSec 60 }
        'disk' { Invoke-RestMethod -Uri "$apiRoot/config/disk/util" -Headers $headers -Method Get -TimeoutSec 60 }
        'details' {
            Invoke-AuditQuery @'
select jsonb_build_object(
  'admin_identity', (select jsonb_build_object(
    'matching_accounts', count(*),
    'legacy_id_matches_email', coalesce(bool_or(id='b01c6977-ded3-43f7-98de-8dbfd45d07d7'::uuid),false),
    'email_confirmed', coalesce(bool_and(email_confirmed_at is not null),false),
    'legacy_admin_still_exists', exists(select 1 from auth.users where id='b01c6977-ded3-43f7-98de-8dbfd45d07d7'::uuid)
  ) from auth.users where lower(email)='deboshoot@gmail.com'),
  'auth_user_count', (select count(*) from auth.users),
  'final_vote_count', (select count(*) from public.final_arena_votes),
  'artwork_statuses', (select jsonb_agg(to_jsonb(t)) from (
    select status,count(*) as row_count from public.opere group by status
  ) t),
  'table_grants', (select jsonb_agg(to_jsonb(t)) from (
    select r.name as grantee,n.nspname as table_schema,c.relname as table_name,
      has_table_privilege(r.name,c.oid,'SELECT') as can_select,
      has_table_privilege(r.name,c.oid,'INSERT') as can_insert,
      has_table_privilege(r.name,c.oid,'UPDATE') as can_update,
      has_table_privilege(r.name,c.oid,'DELETE') as can_delete
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join (values ('anon'),('authenticated')) r(name)
    where n.nspname in ('public','storage') and c.relkind='r'
      and c.relname in ('opere','duels','votes','profiles','final_arenas','final_arena_votes','gallery_months','objects')
  ) t),
  'function_definitions', (select jsonb_agg(to_jsonb(t)) from (
    select p.proname as name,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('start_duel_timer','start_duel_logic','handle_new_user','activate_scheduled_duel','cast_vote','cast_final_arena_vote')
  ) t),
  'candidate_unreferenced_objects', (select count(*) from storage.objects o
    where o.bucket_id='galleria' and not exists (
      select 1 from public.opere a where a.immagine_url = 'https://mpqphroecgfwonclmkyb.supabase.co/storage/v1/object/public/galleria/' || o.name
    )),
  'triggers', (select jsonb_agg(to_jsonb(t)) from (
    select c.relname as table_name,t.tgname as name,t.tgenabled as enabled,pg_get_triggerdef(t.oid) as definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal
  ) t),
  'scheduler', (select jsonb_agg(to_jsonb(t)) from (
    select jobname,schedule,active from cron.job
  ) t)
) as audit;
'@
        }
        'counts' {
            $knownTables = @('profiles','opere','duels','votes','music_tracks','music_duels','music_votes','gallery_months','final_arenas')
            $existing = Invoke-AuditQuery "select tablename from pg_tables where schemaname='public';"
            $selects = @()
            foreach ($table in $knownTables) {
                if ($existing.tablename -contains $table) {
                    $selects += "select '$table' as table_name, count(*) as row_count from public.$table"
                }
            }
            # Counts only: no email, profile, vote or artwork contents are exported.
            if ($selects.Count -gt 0) { Invoke-AuditQuery ($selects -join ' union all ') } else { @() }
        }
    }
    New-Item -ItemType Directory -Path $auditDirectory -Force | Out-Null
    $outputPath = Join-Path $auditDirectory "$Section.json"
    $json = $result | ConvertTo-Json -Depth 40
    [IO.File]::WriteAllText($outputPath,$json,[Text.UTF8Encoding]::new($false))
    if ($Section -in @('schema','storage','details')) {
        Write-Output ("Audit $Section salvato in debug.local/supabase-audit/$Section.json")
    } elseif ($Section -in @('security','performance')) {
        $result.lints | Select-Object name,title,level,categories,metadata,remediation | ConvertTo-Json -Depth 8 -Compress
    } else {
        $result | ConvertTo-Json -Depth 20 -Compress
    }
} catch {
    if ($_.Exception.Response) {
        Write-Output ("Audit $Section fallito: HTTP " + [int]$_.Exception.Response.StatusCode)
    } else {
        # Do not print raw response bodies or headers that may include secrets.
        Write-Output ("Audit $Section fallito: errore locale o di connessione.")
    }
    exit 1
} finally {
    $headers.Clear()
    $credentials.Clear()
}
