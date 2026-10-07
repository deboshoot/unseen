import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';
const sql=await fs.readFile(path.join(app,'supabase/legacy-upload-compatibility.sql'),'utf8');
const tests=`
set local role anon;
do $$ begin
  insert into public.opere(titolo,autore,status,is_in_gallery) values('UNSEEN legacy compatibility test','Test','pending',false);
  begin
    insert into public.opere(titolo,autore,status,is_in_gallery) values('UNSEEN rejected approval test','Test','accepted',false);
    raise exception 'Legacy upload allowed auto approval';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.opere(titolo,autore,status,is_in_gallery,media_asset_id) values('UNSEEN rejected asset test','Test','pending',false,gen_random_uuid());
    raise exception 'Legacy upload allowed a forged R2 reference';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='UNSEEN photo upload' and cmd='INSERT' and with_check like '%galleria%') then raise exception 'Legacy photo uploads unavailable'; end if;
  if not exists(select 1 from storage.buckets where id='galleria' and file_size_limit=5242880 and allowed_mime_types @> array['image/jpeg','image/png','image/webp']) then raise exception 'Legacy image limits changed'; end if;
end $$;`;
await supabaseRequest('database/query','POST',{query:`begin;\n${sql}\n${tests}\nrollback;`,read_only:false});
if(process.argv.includes('--apply')) {
  await supabaseRequest('database/query','POST',{query:`begin;\n${sql}\ncommit;`,read_only:false});
  const name='unseen_legacy_upload_compatibility';
  if(!(await supabaseRequest('database/migrations')).some(entry=>entry.name===name)) {
    await supabaseRequest('database/migrations','PUT',{name,query:sql});
    const entry=(await supabaseRequest('database/migrations')).find(entry=>entry.name===name);
    if(entry) await fs.writeFile(path.join(app,'supabase/migrations',`${entry.version}_${name}.sql`),sql);
  }
  await supabaseRequest('database/query','POST',{query:`begin;\n${tests}\nrollback;`,read_only:false});
  console.log('Vecchi invii fotografici ripristinati con limite 5 MB e stato pending; autoapprovazione e riferimenti R2 contraffatti vietati.');
} else console.log('Compatibilità verificata senza modifiche permanenti.');
