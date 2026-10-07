import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { app, readLocalEnv, validateR2 } from './cloudflare-env.mjs';
const project='mpqphroecgfwonclmkyb';
const credentials=await readLocalEnv('.env.supabase.local');
if(credentials.SUPABASE_PROJECT_REF!==project || !credentials.SUPABASE_ACCESS_TOKEN) throw new Error('Credenziale Supabase mancante o progetto non autorizzato');
export async function supabaseRequest(route,method='GET',body) {
  const response=await fetch(`https://api.supabase.com/v1/projects/${project}/${route}`,{method,headers:{Authorization:`Bearer ${credentials.SUPABASE_ACCESS_TOKEN}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
  const raw=await response.text();
  const result=raw ? JSON.parse(raw) : null;
  if(!response.ok) throw new Error(`Supabase ${route}: HTTP ${response.status}: ${String(result.message||'request failed').slice(0,300)}`);
  return result;
}
async function main() {
  const migration=await fs.readFile(path.join(app,'supabase/r2-storage.sql'),'utf8');
  const tests=await fs.readFile(path.join(app,'supabase/tests/r2-storage.sql'),'utf8');
  const retentionMigration=await fs.readFile(path.join(app,'supabase/r2-retention.sql'),'utf8');
  const hash=createHash('sha256').update(migration+'\n'+retentionMigration).digest('hex');
  const folder=path.resolve(app,'..','debug.local','r2');
  await fs.mkdir(folder,{recursive:true});
  const status=await supabaseRequest('database/query/read-only','POST',{query:"select to_regclass('public.media_assets') is not null as applied;"});
  if(process.argv.includes('--rehearse')) {
    if(status[0]?.applied) throw new Error('Schema R2 già presente: non ripetere la migrazione');
    const result=await supabaseRequest('database/query','POST',{query:`begin;\n${migration}\n${retentionMigration}\n${tests}\nrollback; select 'passed' as r2_rehearsal;`,read_only:false});
    if(!result.some(row=>row.r2_rehearsal==='passed')) throw new Error('Test database non confermato');
    await fs.writeFile(path.join(folder,'database-rehearsal.json'),JSON.stringify({result:'passed',transaction:'rolled_back',hash,at:new Date().toISOString()},null,2));
    process.stdout.write('Schema, ruoli, quote, blocchi e moderazione R2 verificati in transazione annullata.\n');
  }
  if(process.argv.includes('--verify')) {
    if(!status[0]?.applied) throw new Error('Schema R2 remoto assente');
    const result=await supabaseRequest('database/query','POST',{query:`begin;\n${tests}\nrollback; select 'passed' as r2_verify;`,read_only:false});
    if(!result.some(row=>row.r2_verify==='passed')) throw new Error('Verifica permessi R2 non confermata');
    await fs.writeFile(path.join(folder,'database-verified.json'),JSON.stringify({result:'passed',transaction:'rolled_back',at:new Date().toISOString()},null,2));
    process.stdout.write('Configurazione R2 remota verificata; dati di prova annullati.\n');
  }
  if(process.argv.includes('--apply')) {
    if(!status[0]?.applied) {
      const rehearsal=JSON.parse(await fs.readFile(path.join(folder,'database-rehearsal.json'),'utf8'));
      if(rehearsal.result!=='passed'||rehearsal.hash!==hash) throw new Error('Eseguire prima --rehearse sullo stesso SQL');
      await supabaseRequest('database/query','POST',{query:`begin;\n${migration}\ncommit;`,read_only:false});
      await supabaseRequest('database/migrations','PUT',{name:'unseen_r2_storage',query:migration});
      const history=await supabaseRequest('database/migrations');
      const entry=history.find(row=>row.name==='unseen_r2_storage');
      if(entry) await fs.writeFile(path.join(app,'supabase/migrations',`${entry.version}_unseen_r2_storage.sql`),migration);
      process.stdout.write('Schema R2 e tabelle musicali applicati su Supabase.\n');
    }
    const env=await readLocalEnv('.env.cloudflare.local');
    const retention=await supabaseRequest('database/query/read-only','POST',{query:"select pg_get_constraintdef(oid) like '%expired%' as applied from pg_constraint where conrelid='public.r2_uploads'::regclass and conname='r2_uploads_state_check';"});
    if(!retention[0]?.applied) {
      const sql=await fs.readFile(path.join(app,'supabase/r2-retention.sql'),'utf8');
      await supabaseRequest('database/query','POST',{query:`begin;\n${sql}\ncommit;`,read_only:false});
      await supabaseRequest('database/migrations','PUT',{name:'unseen_r2_retention',query:sql});
      const history=await supabaseRequest('database/migrations');
      const entry=history.find(row=>row.name==='unseen_r2_retention');
      if(entry) await fs.writeFile(path.join(app,'supabase/migrations',`${entry.version}_unseen_r2_retention.sql`),sql);
    }
    validateR2(env);
    if(!env.MEDIA_CRON_SECRET) throw new Error('Configurare prima il Media Worker');
    const names=['R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_STAGING_BUCKET','R2_PUBLIC_BUCKET','R2_PUBLIC_URL','MEDIA_ALLOWED_ORIGINS','MEDIA_CRON_SECRET'];
    await supabaseRequest('secrets','POST',names.map(name=>({name,value:env[name]})));
    const bundle=await build({entryPoints:[path.join(app,'supabase/functions/r2-media/index.ts')],bundle:true,write:false,format:'esm',platform:'neutral',external:['npm:*'],logLevel:'silent'});
    const body=bundle.outputFiles[0].text;
    const functions=await supabaseRequest('functions');
    const exists=functions.some(fn=>fn.slug==='r2-media');
    // JWTs are verified inside the function with auth.getUser; also accepts the
    // narrowly scoped cleanup secret. The anonymous Supabase key is not a login.
    await supabaseRequest(exists?'functions/r2-media':'functions',exists?'PATCH':'POST',{...(exists?{}:{slug:'r2-media'}),name:'r2-media',body,verify_jwt:false});
    process.stdout.write('Credenziali solo server e funzione r2-media distribuite.\n');
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url) && process.argv.some(arg=>['--rehearse','--apply','--verify'].includes(arg))) main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
