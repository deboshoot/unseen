param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path -Parent $PSScriptRoot
$auditDirectory = Join-Path (Split-Path -Parent $appDirectory) 'debug.local/supabase-audit'
$project = 'mpqphroecgfwonclmkyb'
$credentials = @{}
foreach ($line in (Get-Content -LiteralPath (Join-Path $appDirectory '.env.supabase.local'))) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') { $credentials[$Matches[1]]=$Matches[2].Trim().Trim('"').Trim("'") }
}
if (!$credentials['SUPABASE_ACCESS_TOKEN'] -or $credentials['SUPABASE_PROJECT_REF'] -ne $project) { throw 'Credenziali locali mancanti o progetto non autorizzato.' }
$headers = @{ Authorization='Bearer '+$credentials['SUPABASE_ACCESS_TOKEN'] }
$api = "https://api.supabase.com/v1/projects/$project/database"
$migration = Get-Content -LiteralPath (Join-Path $appDirectory 'supabase/access-hardening.sql') -Raw
$tests = Get-Content -LiteralPath (Join-Path $appDirectory 'supabase/tests/access-hardening.sql') -Raw

function Invoke-Management([string]$Path,[object]$Body) {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    Invoke-RestMethod -Uri "$api/$Path" -Headers $headers -Method Post -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 90
}
try {
    # Always test in a transaction that rolls back BEFORE applying anything.
    $dryQuery = "begin;`n$migration`n$tests`nrollback;`nselect 'passed' as unseen_access_test;"
    $dryResult = Invoke-Management 'query' @{query=$dryQuery;read_only=$false}
    if (!($dryResult | Where-Object { $_.unseen_access_test -eq 'passed' })) { throw 'Esito finale del test non trovato.' }
    [IO.File]::WriteAllText((Join-Path $auditDirectory 'hardening-test.json'),'{"result":"passed","transaction":"rolled_back"}',[Text.UTF8Encoding]::new($false))
    Write-Output 'Test accesso superati; transazione di prova annullata.'
    if ($Apply) {
        $rollbackPath = Join-Path $auditDirectory 'rollback-access-hardening.sql'
        if (!(Test-Path -LiteralPath $rollbackPath)) { throw 'Backup della configurazione per rollback mancante.' }
        $rollback = Get-Content -LiteralPath $rollbackPath -Raw
        $baseline = Get-Content -LiteralPath (Join-Path $auditDirectory 'before-hardening.json') -Raw | ConvertFrom-Json
        $expectedPolicies = ($baseline.policies | Sort-Object schemaname,tablename,policyname | ConvertTo-Json -Depth 12 -Compress).Replace("'","''")
        $expectedFunctions = ($baseline.functions | Sort-Object name | ConvertTo-Json -Depth 12 -Compress).Replace("'","''")
        $verifyRollback = @'
begin;
__MIGRATION__
__ROLLBACK__
do $$ begin
  if to_regprocedure('public.is_unseen_admin()') is not null or to_regclass('unseen_private.admin_accounts') is not null then raise exception 'Admin objects not reverted'; end if;
  if (select count(*) from (
    select value from jsonb_array_elements('__POLICIES__'::jsonb)
    except select to_jsonb(t) from (
    select * from pg_policies where (schemaname='public' and tablename in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months')) or (schemaname='storage' and tablename='objects')
  ) t) differences)<>0 or (select count(*) from pg_policies where (schemaname='public' and tablename in ('opere','profiles','duels','votes','final_arenas','final_arena_votes','gallery_months')) or (schemaname='storage' and tablename='objects'))<>jsonb_array_length('__POLICIES__'::jsonb) then raise exception 'Policies not restored'; end if;
  if (select jsonb_agg(to_jsonb(t) order by name) from (
    select p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('cast_vote','cast_final_arena_vote','start_duel_logic','start_duel_timer','handle_new_user','activate_scheduled_duel')
  ) t) is distinct from '__FUNCTIONS__'::jsonb then raise exception 'Functions not restored'; end if;
end $$;
rollback;
select 'passed' as unseen_rollback_test;
'@
        $verifyRollback = $verifyRollback.Replace('__MIGRATION__',$migration).Replace('__ROLLBACK__',$rollback).Replace('__POLICIES__',$expectedPolicies).Replace('__FUNCTIONS__',$expectedFunctions)
        $rollbackResult = Invoke-Management 'query' @{query=$verifyRollback;read_only=$false}
        if (!($rollbackResult | Where-Object { $_.unseen_rollback_test -eq 'passed' })) { throw 'Rollback non verificato.' }
        Write-Output 'Ripristino delle policy e delle funzioni verificato in una seconda transazione annullata.'
        # Use Node for commit/history: Windows PowerShell stalled on the
        # migrations endpoint. The SQL endpoint and bounded fetch are reliable.
        $nodeBin = (Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'UnseenTools/node-path.txt') -Raw).Trim()
        & (Join-Path $nodeBin 'node.exe') (Join-Path $PSScriptRoot 'commit-supabase-hardening.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'Commit non confermato: verificare lo stato remoto prima di riprovare.' }
    }
} catch {
    if ($_.ErrorDetails.Message) {
        # API errors describe SQL; do not output headers or local credentials.
        $message = $_.ErrorDetails.Message
        if ($message.Length -gt 1200) { $message=$message.Substring(0,1200) }
        Write-Output $message
    } else { Write-Output $_.Exception.Message }
    exit 1
} finally { $headers.Clear();$credentials.Clear() }
