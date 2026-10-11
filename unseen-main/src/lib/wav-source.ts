/** Read WAV masters by range; only the selected excerpt is decoded.
 * Extensible format: https://learn.microsoft.com/en-us/windows/win32/api/mmreg/ns-mmreg-waveformatextensible
 */
export type WavSource = {
  kind: 'wav'; file: File; duration: number; sampleRate: number; numberOfChannels: number;
  dataOffset: number; frames: number; blockAlign: number; bits: number; floating: boolean; peaks: number[];
};

export function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
const tag = (view: DataView, offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4));
const invalid = () => new Error('Invalid or unsupported WAV');

export function wavSample(view: DataView, offset: number, source: Pick<WavSource, 'bits' | 'floating'>): number {
  let value: number;
  if (source.floating) value = source.bits === 32 ? view.getFloat32(offset, true) : view.getFloat64(offset, true);
  else if (source.bits === 8) value = (view.getUint8(offset) - 128) / 128;
  else if (source.bits === 16) value = view.getInt16(offset, true) / 32768;
  else if (source.bits === 24) {
    const integer = view.getUint8(offset) | view.getUint8(offset + 1) << 8 | view.getUint8(offset + 2) << 16;
    value = (integer << 8 >> 8) / 8388608;
  } else value = view.getInt32(offset, true) / 2147483648;
  return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
}

export async function readWavSource(file: File, signal?: AbortSignal): Promise<WavSource | null> {
  const header = new DataView(await readBlob(file.slice(0, 12)));
  if (header.byteLength < 12 || tag(header, 0) !== 'RIFF' || tag(header, 8) !== 'WAVE') return null;
  const riffEnd = header.getUint32(4, true) + 8;
  if (riffEnd > file.size || riffEnd < 12) throw invalid();
  let format: Omit<WavSource, 'kind' | 'file' | 'duration' | 'dataOffset' | 'frames' | 'peaks'> | undefined;
  let dataOffset = 0, dataBytes = 0;
  for (let offset = 12; offset + 8 <= riffEnd;) {
    signal?.throwIfAborted();
    const chunk = new DataView(await readBlob(file.slice(offset, offset + 8)));
    const size = chunk.getUint32(4, true), begin = offset + 8;
    if (begin + size > riffEnd) throw invalid();
    if (tag(chunk, 0) === 'fmt ') {
      if (size < 16) throw invalid();
      const fmt = new DataView(await readBlob(file.slice(begin, begin + Math.min(size, 40))));
      let encoding = fmt.getUint16(0, true);
      const numberOfChannels = fmt.getUint16(2, true), sampleRate = fmt.getUint32(4, true);
      const blockAlign = fmt.getUint16(12, true), bits = fmt.getUint16(14, true);
      if (encoding === 0xfffe) {
        if (size < 40 || fmt.getUint16(16, true) < 22) throw invalid();
        const tail = [0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113];
        if (!tail.every((byte, index) => fmt.getUint8(28 + index) === byte)) throw invalid();
        encoding = fmt.getUint32(24, true);
        const validBits = fmt.getUint16(18, true);
        if (!validBits || validBits > bits) throw invalid();
      }
      // Preserve browser decoding for other WAV codecs and multichannel exports.
      if (![1, 3].includes(encoding) || ![1, 2].includes(numberOfChannels) || sampleRate < 8000 || sampleRate > 192000 ||
        !(encoding === 3 ? [32, 64] : [8, 16, 24, 32]).includes(bits)) return null;
      if (blockAlign !== numberOfChannels * bits / 8 || fmt.getUint32(8, true) !== sampleRate * blockAlign) throw invalid();
      format = { numberOfChannels, sampleRate, blockAlign, bits, floating: encoding === 3 };
    } else if (tag(chunk, 0) === 'data' && !dataOffset) { dataOffset = begin; dataBytes = size; }
    offset = begin + size + size % 2;
    if (format && dataOffset) break;
  }
  if (!format || !dataOffset || !dataBytes || dataBytes % format.blockAlign) throw invalid();
  const frames = dataBytes / format.blockAlign;
  const source: WavSource = { ...format, kind: 'wav', file, dataOffset, frames, duration: frames / format.sampleRate, peaks: [] };
  for (let index = 0; index < 100; index++) {
    signal?.throwIfAborted();
    const frame = Math.floor(index * frames / 100);
    const view = new DataView(await readBlob(file.slice(dataOffset + frame * source.blockAlign, dataOffset + Math.min(frames, frame + 256) * source.blockAlign)));
    let peak = 0;
    for (let offset = 0; offset < view.byteLength; offset += source.bits / 8) peak = Math.max(peak, Math.abs(wavSample(view, offset, source)));
    source.peaks.push(peak);
  }
  return source;
}

export async function readWavClip(source: WavSource, start: number, end: number, context: OfflineAudioContext, signal?: AbortSignal): Promise<AudioBuffer> {
  const first = Math.floor(start * source.sampleRate), last = Math.min(source.frames, Math.ceil(end * source.sampleRate));
  const buffer = context.createBuffer(source.numberOfChannels, last - first, source.sampleRate);
  const channels = Array.from({ length: source.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const batch = Math.floor(1024 * 1024 / source.blockAlign);
  for (let frame = first; frame < last; frame += batch) {
    signal?.throwIfAborted();
    const count = Math.min(batch, last - frame);
    const view = new DataView(await readBlob(source.file.slice(source.dataOffset + frame * source.blockAlign, source.dataOffset + (frame + count) * source.blockAlign)));
    for (let n = 0; n < count; n++) for (let channel = 0; channel < channels.length; channel++) {
      channels[channel][frame - first + n] = wavSample(view, n * source.blockAlign + channel * source.bits / 8, source);
    }
  }
  return buffer;
}
