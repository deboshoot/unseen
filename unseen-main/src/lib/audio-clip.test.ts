import { describe, expect, it } from 'vitest';
import { encodeClipWav } from './audio-clip';
import { verifiedClipDuration } from '../../supabase/functions/r2-media/validation';

describe('actual clip bytes', () => {
  it('encodes exactly 40 seconds of stereo PCM and verifies duration from bytes', () => {
    const channels = [new Float32Array(40 * 44100), new Float32Array(40 * 44100)];
    channels[0][0] = -1; channels[1][0] = 1;
    const file = encodeClipWav(channels); const view = new DataView(file);
    expect(file.byteLength).toBe(44 + 40 * 44100 * 4);
    expect(verifiedClipDuration(new Uint8Array(file,0,44),file.byteLength,'audio/wav')).toBe(40);
    expect(view.getInt16(44,true)).toBe(-32768); expect(view.getInt16(46,true)).toBe(32767);
    expect(() => encodeClipWav([new Float32Array(40 * 44100 + 1)])).toThrow();
  });
  it('rejects forged sizes, unsupported encodings, MP3 and WAV longer than 40 seconds', () => {
    const file=encodeClipWav([new Float32Array(44100)]); const bytes=new Uint8Array(file); const view=new DataView(file);
    expect(() => verifiedClipDuration(bytes,file.byteLength+2,'audio/wav')).toThrow();
    expect(() => verifiedClipDuration(bytes,file.byteLength,'audio/mpeg')).toThrow();
    view.setUint16(34,32,true); expect(() => verifiedClipDuration(bytes,file.byteLength,'audio/wav')).toThrow(); view.setUint16(34,16,true);
    const length=44+41*44100*2; view.setUint32(4,length-8,true); view.setUint32(40,length-44,true);
    expect(() => verifiedClipDuration(bytes,length,'audio/wav')).toThrow();
  });
});
