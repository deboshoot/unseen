import { describe, expect, it } from 'vitest';
import { hasExpectedSignature, validateSubmission } from '../../supabase/functions/r2-media/validation';
const valid={kind:'photo',metadata:{titolo:' Photo ',autore:' Artist ',storia:'',social_link:''},files:[{kind:'image',mime:'image/webp',bytes:100}]};
describe('media server validation',()=>{
  it('rejects extra files, dangerous formats and oversized images before granting R2 access',()=>{
    expect(()=>validateSubmission({...valid,files:[...valid.files,...valid.files]},crypto.randomUUID())).toThrow();
    expect(()=>validateSubmission({...valid,files:[{kind:'image',mime:'image/svg+xml',bytes:100}]},crypto.randomUUID())).toThrow();
    expect(()=>validateSubmission({...valid,files:[{kind:'image',mime:'image/webp',bytes:5*1024*1024+1}]},crypto.randomUUID())).toThrow();
  });
  it('controls storage paths and ignores client status, owner and URLs',()=>{
    const submission=validateSubmission({...valid,status:'accepted',user_id:'other-user',url:'https://attacker.example'},'00000000-0000-0000-0000-000000000001');
    expect(submission.metadata).toEqual({titolo:'Photo',autore:'Artist',storia:'',social_link:''});
    expect(submission.files[0].uploadKey).toMatch(/^incoming\/00000000-0000-0000-0000-000000000001\/image.webp$/);
    expect(submission.files[0].key).toMatch(/^assets\/[a-f0-9-]{36}\/image.webp$/);
  });
  it('requires exactly one cover and one audio for a music submission',()=>{
    expect(()=>validateSubmission({kind:'music',metadata:{title:'Track',artist:'Artist'},files:[{kind:'cover',mime:'image/png',bytes:1},{kind:'cover',mime:'image/png',bytes:1}]},crypto.randomUUID())).toThrow();
  });
  it('checks file signatures rather than trusting MIME labels',()=>{
    expect(hasExpectedSignature(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png')).toBe(true);
    expect(hasExpectedSignature(new TextEncoder().encode('<script>alert(1)</script>'),'image/png')).toBe(false);
    expect(hasExpectedSignature(new TextEncoder().encode('RIFF0000WAVE'),'audio/wav')).toBe(true);
    expect(hasExpectedSignature(new TextEncoder().encode('RIFF0000WEBP'),'audio/wav')).toBe(false);
  });
});
