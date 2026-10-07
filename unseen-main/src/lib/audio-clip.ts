export const MAX_CLIP_SECONDS = 40;
const SAMPLE_RATE = 44100;

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, 1, SAMPLE_RATE);
  const buffer = await context.decodeAudioData(await file.arrayBuffer());
  if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Audio non valido');
  return buffer;
}

export function waveformPeaks(buffer: AudioBuffer, count = 100): number[] {
  const samples = buffer.getChannelData(0);
  const stride = Math.max(1, Math.floor(samples.length / count));
  return Array.from({ length: count }, (_, index) => {
    let peak = 0;
    for (let n = index * stride; n < Math.min(samples.length, (index + 1) * stride); n += Math.max(1, Math.floor(stride / 150))) peak = Math.max(peak, Math.abs(samples[n]));
    return peak;
  });
}

/** Canonical PCM WAV: the server checks the frame count against the actual file. */
export function encodeClipWav(channels: Float32Array[], sampleRate = SAMPLE_RATE): ArrayBuffer {
  if (!channels.length || channels.length > 2 || !channels[0].length || channels.some(channel => channel.length !== channels[0].length)) throw new Error('Invalid audio channels');
  const frames = channels[0].length;
  if (![44100, 48000].includes(sampleRate) || frames > sampleRate * MAX_CLIP_SECONDS) throw new Error('Clip exceeds 40 seconds');
  const dataBytes = frames * channels.length * 2;
  const output = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(output);
  const text = (offset: number, value: string) => [...value].forEach((char, n) => view.setUint8(offset + n, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) for (const channel of channels) {
    const value = Math.max(-1, Math.min(1, channel[frame]));
    view.setInt16(offset, Math.round(value * (value < 0 ? 32768 : 32767)), true); offset += 2;
  }
  return output;
}

export async function renderAudioClip(buffer: AudioBuffer, start: number, end: number): Promise<File> {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > buffer.duration + .001 || end <= start || end - start > MAX_CLIP_SECONDS + .00001) throw new Error('Seleziona un estratto valido fino a 40 secondi.');
  const frames = Math.min(SAMPLE_RATE * MAX_CLIP_SECONDS, Math.floor((end - start) * SAMPLE_RATE));
  if (frames < 1) throw new Error('Estratto troppo breve.');
  const context = new OfflineAudioContext(Math.min(2, buffer.numberOfChannels), frames, SAMPLE_RATE);
  const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start(0, start, frames / SAMPLE_RATE);
  const clip = await context.startRendering();
  const data = encodeClipWav(Array.from({ length: clip.numberOfChannels }, (_, index) => clip.getChannelData(index)));
  return new File([data], 'unseen-clip.wav', { type: 'audio/wav' });
}
