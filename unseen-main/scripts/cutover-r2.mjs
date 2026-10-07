import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';
import { checkLegacyRedirect } from './check-legacy-redirect.mjs';

const sql = await fs.readFile(path.join(app, 'supabase/r2-cutover.sql'), 'utf8');
const checks = `
do $$ begin
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('INSERT','ALL') and roles && array['anon','authenticated']::name[]) then
    raise exception 'A legacy storage upload policy remains';
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='UNSEEN photo read') then
    raise exception 'Legacy public media reads must remain';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='opere' and policyname='UNSEEN admin artworks') then
    raise exception 'Admin artwork management must remain';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='opere' and policyname='UNSEEN pending photo submission') then
    raise exception 'Legacy anonymous submission remains';
  end if;
end $$;`;
const folder = path.resolve(app, '..', 'debug.local', 'r2');
await fs.mkdir(folder, { recursive: true });
if (process.argv.includes('--rehearse')) {
  await supabaseRequest('database/query', 'POST', { query: `begin;\n${sql}\n${checks}\nrollback;`, read_only: false });
  await fs.writeFile(path.join(folder, 'cutover-rehearsal.json'), JSON.stringify({ passed: true, at: new Date().toISOString() }));
  console.log('Passaggio a R2 verificato in transazione annullata; letture precedenti e gestione admin preservate.');
} else if (process.argv.includes('--apply')) {
  if(!(await checkLegacyRedirect()).passed) throw new Error('Verificare prima il frontend R2 sul dominio originale e il redirect del link Cloudflare: non interrompere i vecchi invii');
  const deployment = JSON.parse(await fs.readFile(path.join(folder, 'production-verified.json'), 'utf8'));
  if (!deployment.passed || !['https://unseen-virid.vercel.app','https://unseen.unseen-deboshoot.workers.dev'].includes(deployment.url) || Date.now() - Date.parse(deployment.at) > 3600000) throw new Error('Verificare prima il frontend R2 in produzione');
  await supabaseRequest('database/query', 'POST', { query: `begin;\n${sql}\n${checks}\ncommit;`, read_only: false });
  const history = await supabaseRequest('database/migrations');
  if (!history.some(entry => entry.name === 'unseen_r2_cutover_after_redirect')) {
    await supabaseRequest('database/migrations', 'PUT', { name: 'unseen_r2_cutover_after_redirect', query: sql });
    const entry = (await supabaseRequest('database/migrations')).find(entry => entry.name === 'unseen_r2_cutover_after_redirect');
    if (entry) await fs.writeFile(path.join(app, 'supabase/migrations', `${entry.version}_unseen_r2_cutover_after_redirect.sql`), sql);
  }
  console.log('Nuovi caricamenti Supabase Storage disabilitati; file precedenti conservati e leggibili.');
} else throw new Error('Usare --rehearse o --apply dopo la verifica del deploy');
