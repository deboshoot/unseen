import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';

const sql=await fs.readFile(path.join(app,'supabase/music-submissions.sql'),'utf8');
const featuredArtistsSql=await fs.readFile(path.join(app,'supabase/migrations/20261104160000_unseen_featured_artists.sql'),'utf8');
const tests=await fs.readFile(path.join(app,'supabase/tests/music-submissions.sql'),'utf8');
const folder=path.resolve(app,'../debug.local/music-submissions'); await fs.mkdir(folder,{recursive:true});
const status=await request('database/query/read-only','POST',{query:"select exists(select 1 from information_schema.columns where table_schema='public' and table_name='music_tracks' and column_name='instagram_username') as submissions_applied,exists(select 1 from information_schema.columns where table_schema='public' and table_name='music_tracks' and column_name='collaborators') as featured_artists_applied;"});
const migrationSql=status[0].submissions_applied?featuredArtistsSql:sql;
const migrationName=status[0].submissions_applied?'unseen_featured_artists':'unseen_music_submissions';
const hash=createHash('sha256').update(migrationSql+'\n'+tests).digest('hex');
if(process.argv.includes('--rehearse')||process.argv.includes('--verify')) {
  const result=await request('database/query','POST',{query:`begin;\n${status[0].featured_artists_applied?'':migrationSql}\n${tests}\nrollback; select 'passed' as music_submission_tests;`,read_only:false});
  if(!result.some(row=>row.music_submission_tests==='passed')) throw new Error('Music submission tests not confirmed');
  await fs.writeFile(path.join(folder,'database-tested.json'),JSON.stringify({hash,passed:true,rolledBack:true,at:new Date().toISOString()},null,2));
  console.log('Music metadata, featured artists, duration constraints, private moderation, permissions and championship snapshots verified; fixtures rolled back.');
}
if(process.argv.includes('--apply')&&!status[0].featured_artists_applied) {
  const check=JSON.parse(await fs.readFile(path.join(folder,'database-tested.json'),'utf8'));
  if(!check.passed||check.hash!==hash) throw new Error('Run --rehearse on the same SQL first');
  await request('database/query','POST',{query:`begin;\n${migrationSql}\ncommit;`,read_only:false});
  await request('database/migrations','PUT',{name:migrationName,query:migrationSql});
  const history=await request('database/migrations'); const migration=history.find(row=>row.name===migrationName);
  if(migration) await fs.writeFile(path.join(app,'supabase/migrations',`${migration.version}_${migrationName}.sql`),migrationSql);
  console.log('Music submission and featured artist schema applied without changing existing records.');
}
if(process.argv.includes('--deploy-function')) {
  if(!status[0].featured_artists_applied) throw new Error('Apply featured artist schema before deploying the function');
  const bundle=await build({entryPoints:[path.join(app,'supabase/functions/r2-media/index.ts')],bundle:true,write:false,format:'esm',platform:'neutral',external:['npm:*'],logLevel:'silent'});
  await request('functions/r2-media','PATCH',{name:'r2-media',body:bundle.outputFiles[0].text,verify_jwt:false});
  console.log('R2 function deployed: official links validated and actual audio limited to 40 seconds.');
}
