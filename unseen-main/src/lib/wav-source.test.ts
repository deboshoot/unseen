import { describe, expect, it } from 'vitest';
import { readBlob, readWavClip, readWavSource, wavSample } from './wav-source';
import { decodeAudioFile, encodeClipWav } from './audio-clip';
import { MAX_AUDIO_SOURCE_BYTES, musicFileError } from './music';

function fixture(bits = 24, encoding = 1, extensible = false, frames = 480) {
  const align = bits / 8 * 2, fmtSize = extensible ? 40 : 16;
  // Include an odd-sized metadata chunk before fmt and data.
  const dataOffset = 12 + 12 + 8 + fmtSize + 8;
  const bytes = new ArrayBuffer(dataOffset + frames * align), view = new DataView(bytes);
  const text = (at: number, value: string) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'JUNK'); view.setUint32(16, 3, true);
  text(24, 'fmt '); view.setUint32(28, fmtSize, true);
  view.setUint16(32, extensible ? 0xfffe : encoding, true); view.setUint16(34, 2, true);
  view.setUint32(36, 48000, true); view.setUint32(40, 48000 * align, true);
  view.setUint16(44, align, true); view.setUint16(46, bits, true);
  if (extensible) {
    view.setUint16(48, 22, true); view.setUint16(50, bits, true); view.setUint32(52, 3, true);
    view.setUint32(56, encoding, true);
    new Uint8Array(bytes, 60, 12).set([0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113]);
  }
  text(dataOffset - 8, 'data'); view.setUint32(dataOffset - 4, frames * align, true);
  return { bytes, view, dataOffset, file: new File([bytes], 'MASTER.WAV', { type: 'application/octet-stream' }) };
}

describe('WAV master handling', () => {
  it.each([[8, 1, false], [16, 1, false], [24, 1, false], [32, 1, false], [32, 3, false], [64, 3, false], [24, 1, true], [32, 3, true]])('reads %i-bit encoding %i (extensible %s) with metadata and unknown MIME', async (bits, encoding, extensible) => {
    const { file } = fixture(bits as number, encoding as number, extensible as boolean);
    const source = await readWavSource(file);
    expect(source).toMatchObject({ kind: 'wav', bits, floating: encoding === 3, numberOfChannels: 2, sampleRate: 48000, duration: .01 });
    expect(source?.peaks).toHaveLength(100);
    expect(musicFileError(file, 'audio')).toBeNull();
  });
  it('reads large masters with bounded slices, including a WAV renamed .waw', async () => {
    const { bytes, dataOffset } = fixture();
    const frames = 48000 * 180, size = dataOffset + frames * 6;
    const header = bytes.slice(0, dataOffset), view = new DataView(header);
    view.setUint32(4, size - 8, true); view.setUint32(dataOffset - 4, frames * 6, true);
    const reads: number[] = [];
    const file = { name: 'master.waw', type: '', size, slice: (start: number, end: number) => {
      reads.push(end - start);
      return new Blob([start < dataOffset ? header.slice(start, end) : new Uint8Array(end - start)]);
    } } as File;
    expect(size).toBeGreaterThan(30 * 1024 * 1024);
    expect(musicFileError(file, 'audio')).toBeNull();
    expect(await decodeAudioFile(file)).toMatchObject({ kind: 'wav', duration: 180 });
    expect(Math.max(...reads)).toBeLessThanOrEqual(1536);
    expect(reads.reduce((a, b) => a + b, 0)).toBeLessThan(160000);
  });
  it('extracts the selected stereo frames with signed 24-bit samples', async () => {
    const { file, view, dataOffset } = fixture();
    view.setUint8(dataOffset + 2 * 6 + 2, 0x80);
    view.setUint8(dataOffset + 2 * 6 + 3, 0xff); view.setUint8(dataOffset + 2 * 6 + 4, 0xff); view.setUint8(dataOffset + 2 * 6 + 5, 0x7f);
    // File snapshots its bytes, so create it after populating the fixture.
    const source = await readWavSource(new File([view.buffer], file.name));
    const channels = [new Float32Array(2), new Float32Array(2)];
    const context = { createBuffer: () => ({ getChannelData: (n: number) => channels[n] }) } as unknown as OfflineAudioContext;
    await readWavClip(source!, 2 / 48000, 4 / 48000, context);
    expect(channels[0][0]).toBe(-1); expect(channels[1][0]).toBeCloseTo(1);
    expect(channels[0][1]).toBe(0);
  });
  it('handles nonfinite float samples and clipping', () => {
    const view = new DataView(new ArrayBuffer(12));
    view.setFloat32(0, NaN, true); view.setFloat32(4, 2, true); view.setFloat32(8, -2, true);
    expect([0, 4, 8].map(offset => wavSample(view, offset, { bits: 32, floating: true }))).toEqual([0, 1, -1]);
  });
  it('rejects truncated WAV, bad alignment and unrecognized extensible GUIDs', async () => {
    const truncated = fixture(); truncated.view.setUint32(4, truncated.bytes.byteLength + 100, true);
    await expect(readWavSource(new File([truncated.bytes], 'bad.wav'))).rejects.toThrow();
    const aligned = fixture(); aligned.view.setUint16(44, 1, true);
    await expect(readWavSource(new File([aligned.bytes], 'bad.wav'))).rejects.toThrow();
    const guid = fixture(24, 1, true); guid.view.setUint8(69, 0);
    await expect(readWavSource(new File([guid.bytes], 'bad.wav'))).rejects.toThrow();
  });
  it('cancels stale work and leaves MP3 decoding to the browser', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(readWavSource(fixture().file, controller.signal)).rejects.toThrow();
    expect(await readWavSource(new File(['ID3 MP3'], 'song.mp3'))).toBeNull();
    expect(await readBlob(new File(['abc'], 'file'))).toHaveProperty('byteLength', 3);
  });
  it('preserves browser decoding for other WAV codecs', async () => {
    expect(await readWavSource(fixture(16, 6).file)).toBeNull();
  });
  it('accepts the local source boundary and keeps the final WAV below the server limit', () => {
    expect(musicFileError({ name: 'file.wav', type: '', size: MAX_AUDIO_SOURCE_BYTES } as File, 'audio')).toBeNull();
    expect(musicFileError({ name: 'file.wav', type: '', size: MAX_AUDIO_SOURCE_BYTES + 1 } as File, 'audio')).toBe('size');
    expect(encodeClipWav([new Float32Array(40 * 44100), new Float32Array(40 * 44100)]).byteLength).toBeLessThan(7 * 1024 * 1024);
  });
});
