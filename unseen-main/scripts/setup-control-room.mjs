import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest as request } from './setup-supabase-r2.mjs';
const sql=await fs.readFile(path.join(app,'supabase/championship-control-room.sql'),'utf8');
const coreTests=await fs.readFile(path.join(app,'supabase/tests/championship.sql'),'utf8');
const tests=await fs.readFile(path.join(app,'supabase/tests/championship-control-room.sql'),'utf8');
const hash=createHash('sha256').update(sql+coreTests+tests).digest('hex');
const folder=path.resolve(app,'../debug.local/control-room'); await fs.mkdir(folder,{recursive:true});
const status=await request('database/query/read-only','POST',{query:"select to_regclass('public.championship_gallery') is not null as applied;"});
if(process.argv.includes('--rehearse')||process.argv.includes('--verify')) {
  const result=await request('database/query','POST',{query:`begin;\n${status[0].applied?'':sql}\n${coreTests}\n${tests}\nrollback; select 'passed' as control_room_tests;`,read_only:false});
  if(!result.some(row=>row.control_room_tests==='passed')) throw new Error('Control room tests not confirmed');
  await fs.writeFile(path.join(folder,'database-tested.json'),JSON.stringify({hash,passed:true,rolledBack:true,at:new Date().toISOString()},null,2));
  console.log('Championships, secret scores via RPC/REST, admin access, automatic photo/music gallery, Rome starting month and idempotency verified; fixtures rolled back.');
}
if(process.argv.includes('--apply')&&!status[0].applied) {
  const check=JSON.parse(await fs.readFile(path.join(folder,'database-tested.json'),'utf8'));
  if(!check.passed||check.hash!==hash) throw new Error('Run --rehearse on the same migration and tests first');
  await request('database/query','POST',{query:`begin;\n${sql}\ncommit;`,read_only:false});
  await request('database/migrations','PUT',{name:'unseen_championship_control_room',query:sql});
  const history=await request('database/migrations'); const migration=history.find(row=>row.name==='unseen_championship_control_room');
  if(!migration) throw new Error('Migration history not confirmed');
  await fs.writeFile(path.join(app,'supabase/migrations',`${migration.version}_unseen_championship_control_room.sql`),sql);
  console.log('Control room backend applied: live scores private, automatic monthly champions enabled.');
}
