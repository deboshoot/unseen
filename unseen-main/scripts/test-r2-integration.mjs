import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { app, readLocalEnv } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';
const env=await readLocalEnv('.env.cloudflare.local');
const testOrigin=process.env.MEDIA_TEST_ORIGIN || 'https://unseen-virid.vercel.app';
if(!env.MEDIA_ALLOWED_ORIGINS.split(',').includes(testOrigin)) throw new Error('Origine di prova non autorizzata');
const base='https://mpqphroecgfwonclmkyb.supabase.co';
const keys=await supabaseRequest('api-keys');
let anon=keys.find(key=>key.name==='anon')?.api_key;
if(process.argv.includes('--production-key')) {
  const primary='https://unseen-virid.vercel.app';
  const html=await(await fetch(primary,{signal:AbortSignal.timeout(20000)})).text();
  const script=html.match(/src="([^\"]+\.js)"/)?.[1];
  if(!script) throw new Error('Bundle pubblico non disponibile');
  const code=await(await fetch(new URL(script,primary),{signal:AbortSignal.timeout(20000)})).text();
  const publicKey=code.match(/\bsb_publishable_[A-Za-z0-9_-]+/)?.[0];
  if(publicKey) anon=publicKey;
  else if(!code.includes(anon)) throw new Error('Chiave della build pubblica non riconosciuta');
}
const service=keys.find(key=>key.name==='service_role')?.api_key;
if(!anon||!service) throw new Error('Chiavi Supabase non disponibili');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const db=createClient(base,service,options);
const userClient=createClient(base,anon,options);
const adminClient=createClient(base,anon,options);
const fixture={userId:null,submissions:[],duel:null};
const record=path.resolve(app,'..','debug.local','r2','smoke-fixtures.json');
const checks={};
const save=()=>fs.writeFile(record,JSON.stringify(fixture,null,2));
async function call(body,token,expected=200,origin=testOrigin) {
  const response=await fetch(`${base}/functions/v1/r2-media`,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:anon,'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const data=await response.json();
  assert.equal(response.status,expected,`Media action ${body.action}: HTTP ${response.status}, ${data.error||''}`);
  return data;
}
async function submit(kind,metadata,files,token,expected=200) {
  const ticket=await call({action:'prepare',kind,metadata,files:files.map(file=>({kind:file.kind,mime:file.mime,bytes:file.bytes.length}))},token);
  fixture.submissions.push({id:ticket.id,kind}); await save();
  for(const item of ticket.files) {
    const file=files.find(file=>file.kind===item.kind);
    const signed=new URL(item.url);
    assert.ok(signed.searchParams.get('X-Amz-SignedHeaders').includes('content-length'));
    const bad=await fetch(item.url,{method:'PUT',headers:{'Content-Type':item.contentType},body:new Uint8Array(file.bytes.length+1),signal:AbortSignal.timeout(15000)});
    assert.equal(bad.status,403,'Signature must enforce declared file size');
    const upload=await fetch(item.url,{method:'PUT',headers:{'Content-Type':item.contentType},body:file.bytes,signal:AbortSignal.timeout(30000)});
    assert.equal(upload.status,200,'Signed R2 upload failed');
  }
  const result=await call({action:'complete',id:ticket.id},token,expected);
  if(expected!==200) return ticket.id;
  assert.equal(result.id,ticket.id);
  assert.deepEqual(await call({action:'complete',id:ticket.id},token),result);
  return ticket.id;
}
function clipFixture(source,seconds) {
  // Resample the existing mono 22050 Hz demo into the canonical browser WAV.
  const frames=44100*seconds, data=Buffer.alloc(frames*2), header=Buffer.alloc(44);
  for(let frame=0;frame<frames;frame++) data.writeInt16LE(source.readInt16LE(44+(Math.floor(frame/2)%((source.length-44)/2))*2),frame*2);
  header.write('RIFF');header.writeUInt32LE(data.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(44100,24);header.writeUInt32LE(88200,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
  return Buffer.concat([header,data]);
}
async function main() {
  await call({action:'prepare'},anon,401);
  checks.anonDenied=true;
  const email=`unseen-r2-test-${randomUUID()}@example.invalid`;
  const password=randomBytes(24).toString('hex');
  const {data:newUser,error:createError}=await db.auth.admin.createUser({email,password,email_confirm:true});
  if(createError) throw new Error('Creazione utente temporaneo non riuscita');
  fixture.userId=newUser.user.id; await save();
  const {data:login,error:loginError}=await userClient.auth.signInWithPassword({email,password});
  if(loginError||!login.session) throw new Error('Accesso utente temporaneo non riuscito');
  const token=login.session.access_token;
  await call({action:'moderate',kind:'photo',id:randomUUID(),status:'accepted'},token,403);
  await call({action:'prepare'},token,403,'https://other.example');
  checks.userCannotModerate=true;
  // generateLink does not send mail. The short-lived administrator session is
  // used for the requested integration test and signed out locally in finally.
  const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email:'deboshoot@gmail.com'});
  if(linkError||!link.properties.hashed_token) throw new Error('Sessione admin di verifica non disponibile');
  const {data:adminLogin,error:adminError}=await adminClient.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'});
  if(adminError||!adminLogin.session) throw new Error('Accesso admin di verifica non riuscito');
  const adminToken=adminLogin.session.access_token;
  const {data:isAdmin,error:roleError}=await adminClient.rpc('is_unseen_admin');
  assert.ok(!roleError&&isAdmin,'Confirmed administrator denied');
  checks.onlyConfirmedAdmin=true;
  const cover=await fs.readFile(path.join(app,'public/music/demo-nova.png'));
  const source=await fs.readFile(path.join(app,'public/music/afterhours.wav'));
  const audio=clipFixture(source,40);
  const photo=await submit('photo',{titolo:'UNSEEN R2 test',autore:'UNSEEN TEST',storia:'Temporary integration fixture',social_link:''},[{kind:'image',mime:'image/png',bytes:cover}],token);
  const {data:photoRow,error:photoError}=await db.from('opere').select('*').eq('id',photo).single();
  assert.ok(!photoError&&photoRow.status==='pending'&&photoRow.owner_id===fixture.userId&&photoRow.media_asset_id);
  assert.ok(photoRow.immagine_url.startsWith(env.R2_PUBLIC_URL));
  const before=await fetch(photoRow.immagine_url,{headers:{Range:'bytes=0-63'},signal:AbortSignal.timeout(15000)});
  assert.equal(before.status,404,'Pending media exposed publicly');
  const {urls}=await call({action:'preview',ids:[photoRow.media_asset_id]},adminToken);
  assert.ok(urls[photoRow.media_asset_id].includes('X-Amz-Signature='));
  const privateGet=await fetch(urls[photoRow.media_asset_id],{headers:{Origin:testOrigin},signal:AbortSignal.timeout(15000)});
  assert.equal(privateGet.status,200);
  checks.privateReview=true;
  await call({action:'moderate',kind:'photo',id:photo,status:'accepted'},adminToken);
  const publicGet=await fetch(photoRow.immagine_url,{headers:{Origin:testOrigin},signal:AbortSignal.timeout(15000)});
  assert.equal(publicGet.status,200);
  assert.equal(publicGet.headers.get('access-control-allow-origin'),testOrigin);
  assert.equal((await publicGet.arrayBuffer()).byteLength,cover.length);
  await call({action:'moderate',kind:'photo',id:photo,status:'rejected'},adminToken);
  const revoked=await fetch(photoRow.immagine_url,{headers:{Range:'bytes=0-63'},signal:AbortSignal.timeout(15000)});
  assert.equal(revoked.status,404);
  checks.photoModeration=true;
  const tracks=[];
  for(let i=0;i<2;i++) {
    const id=await submit('music',{title:`UNSEEN R2 test ${i}`,artist:'UNSEEN TEST',story:'Must be ignored',audio_duration_seconds:'1',instagram_username:'@unseen_test',youtube_url:'https://youtu.be/abcdefghijk?t=1',instagram_reel_url:'https://www.instagram.com/reel/Unseen_test/',spotify_url:'https://open.spotify.com/track/1234567890123456789012'},[{kind:'cover',mime:'image/png',bytes:cover},{kind:'audio',mime:'audio/wav',bytes:audio}],token);
    await call({action:'moderate',kind:'music',id,status:'accepted'},adminToken);
    const {data:track,error}=await db.from('music_tracks').select('*').eq('id',id).single();
    assert.ok(!error&&track.cover_asset_id&&track.audio_asset_id&&track.audio_url.startsWith(env.R2_PUBLIC_URL));
    assert.equal(track.audio_duration_seconds,40);
    assert.equal(track.story,'');
    assert.equal(track.instagram_username,'unseen_test');
    assert.equal(track.youtube_url,'https://www.youtube.com/watch?v=abcdefghijk');
    assert.equal(track.instagram_reel_url,'https://www.instagram.com/reel/Unseen_test/');
    assert.equal(track.spotify_url,'https://open.spotify.com/track/1234567890123456789012');
    tracks.push(track);
  }
  const range=await fetch(tracks[0].audio_url,{headers:{Range:'bytes=0-63',Origin:testOrigin},signal:AbortSignal.timeout(15000)});
  assert.equal(range.status,206);
  assert.equal((await range.arrayBuffer()).byteLength,64);
  assert.equal(range.headers.get('content-range'),`bytes 0-63/${audio.length}`);
  checks.musicRangeCors=true;
  const rejected=await submit('music',{title:'UNSEEN invalid clip',artist:'UNSEEN TEST',audio_duration_seconds:'1'},[{kind:'cover',mime:'image/png',bytes:cover},{kind:'audio',mime:'audio/wav',bytes:clipFixture(source,41)}],token,400);
  const {count:invalidTracks,error:invalidError}=await db.from('music_tracks').select('id',{count:'exact',head:true}).eq('id',rejected);
  assert.ok(!invalidError&&invalidTracks===0,'Overlong clip must not become a submission');
  // Expire failed test uploads so the normal R2 cleanup removes incoming bytes.
  const {error:expiryError}=await db.from('r2_uploads').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',rejected);
  assert.ok(!expiryError);await call({action:'cleanup'},env.MEDIA_CRON_SECRET);
  checks.clipDurationAndSocials=true;
  fixture.duel=randomUUID(); await save();
  const {error:duelError}=await adminClient.from('music_duels').insert({id:fixture.duel,track_1_id:tracks[0].id,track_2_id:tracks[1].id,start_at:new Date(Date.now()-60000).toISOString(),end_at:new Date(Date.now()+3600000).toISOString(),is_active:true});
  assert.ok(!duelError,'Admin music duel creation failed');
  const {error:voteError}=await userClient.rpc('cast_music_vote',{p_duel_id:fixture.duel,p_vote_slot:1});
  assert.equal(voteError?.code,'42501','Former daily arena voting must be retired');
  const {data:duel}=await db.from('music_duels').select('votes_1,votes_2').eq('id',fixture.duel).single();
  assert.deepEqual(duel,{votes_1:0,votes_2:0});
  checks.legacyVotingRetired=true;
  const report=path.resolve(app,'..','debug.local','r2','integration-check.json');
  await fs.writeFile(report,JSON.stringify({at:new Date().toISOString(),checks,temporaryFixtures:true},null,2));
  process.stdout.write('R2 + Supabase: autenticazione, upload firmati, limiti reali, moderazione privata/pubblica, audio Range/CORS e voti verificati.\n');
}
try { await main(); }
catch(error) { process.stderr.write(`Verifica interrotta: ${error.message}\n`); process.exitCode=1; }
finally {
  let clean=true;
  if(fixture.duel) { const {error}=await db.from('music_duels').delete().eq('id',fixture.duel); if(error) clean=false; }
  for(const submission of fixture.submissions) {
    const {error}=await db.from(submission.kind==='photo'?'opere':'music_tracks').delete().eq('id',submission.id);
    if(error) clean=false;
    const {error:uploadError}=await db.from('r2_uploads').delete().eq('id',submission.id);
    if(uploadError) clean=false;
  }
  try { await call({action:'cleanup'},env.MEDIA_CRON_SECRET); } catch { clean=false; }
  if(fixture.userId) { const {error}=await db.auth.admin.deleteUser(fixture.userId); if(error) clean=false; }
  await Promise.allSettled([userClient.auth.signOut({scope:'local'}),adminClient.auth.signOut({scope:'local'})]);
  if(clean) { await fs.writeFile(record,JSON.stringify({cleaned:true,at:new Date().toISOString()},null,2)); process.stdout.write('Dati e utente temporanei eliminati; sessione di verifica chiusa.\n'); }
  else { process.stderr.write('Pulizia da completare: riferimenti di prova conservati nel file locale.\n'); process.exitCode=1; }
}
