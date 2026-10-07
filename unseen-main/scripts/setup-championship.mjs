import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';
const sql = await fs.readFile(path.join(app,'supabase/championship.sql'),'utf8');
const tests = await fs.readFile(path.join(app,'supabase/tests/championship.sql'),'utf8');
const hash = createHash('sha256').update(sql+'\n'+tests).digest('hex');
const folder = path.resolve(app,'../debug.local/championship');
await fs.mkdir(folder,{recursive:true});
const status = await request('database/query/read-only','POST',{query:"select to_regclass('public.championships') is not null as applied;"});
if (process.argv.includes('--rehearse') || process.argv.includes('--verify')) {
  const result = await request('database/query','POST',{query:`begin;\n${status[0].applied?'':sql}\n${tests}\nrollback; select 'passed' as championship_tests;`,read_only:false});
  if (!result.some(row=>row.championship_tests==='passed')) throw new Error('Championship tests not confirmed');
  await fs.writeFile(path.join(folder,'database-tested.json'),JSON.stringify({hash,passed:true,at:new Date().toISOString(),rolledBack:true},null,2));
  console.log('Championship: schedule, bracket, votes, roles, tie, catchup, cancellation verified; fixtures rolled back.');
}
if (process.argv.includes('--apply') && !status[0].applied) {
  const check=JSON.parse(await fs.readFile(path.join(folder,'database-tested.json'),'utf8'));
  if (!check.passed || check.hash!==hash) throw new Error('Run --rehearse on this SQL first');
  await request('database/query','POST',{query:`begin;\n${sql}\ncommit;`,read_only:false});
  await request('database/migrations','PUT',{name:'unseen_championship',query:sql});
  const history=await request('database/migrations');
  const migration=history.find(row=>row.name==='unseen_championship');
  if (migration) await fs.writeFile(path.join(app,'supabase/migrations',`${migration.version}_unseen_championship.sql`),sql);
  console.log('Championship schema applied; minute scheduler enabled; old data preserved.');
}
