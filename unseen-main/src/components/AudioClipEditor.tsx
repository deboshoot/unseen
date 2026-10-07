import { useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, Scissors } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { musicSubmitCopy } from '@/i18n/music-submit-copy';
import { MAX_CLIP_SECONDS, waveformPeaks } from '@/lib/audio-clip';
import { formatAudioTime } from '@/lib/music';

type Props = { buffer: AudioBuffer; start: number; end: number; onChange: (start: number, end: number) => void; clipUrl: string; activeId: string | null; onActiveChange: (id: string | null) => void; disabled: boolean };
export default function AudioClipEditor({ buffer, start, end, onChange, clipUrl, activeId, onActiveChange, disabled }: Props) {
  const { locale } = useI18n(); const copy = musicSubmitCopy[locale];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const peaks = useMemo(() => waveformPeaks(buffer), [buffer]);
  const minimum = Math.min(.1, buffer.duration);
  useEffect(() => { if (activeId !== 'clip-editor') audioRef.current?.pause(); }, [activeId]);
  useEffect(() => { const element = audioRef.current; return () => element?.pause(); }, []);
  const changeStart = (value: number) => {
    if (!Number.isFinite(value)) return;
    const nextStart = Math.max(0, Math.min(value, buffer.duration - minimum));
    onChange(nextStart, Math.min(buffer.duration, nextStart + Math.min(MAX_CLIP_SECONDS, end - start)));
  };
  const changeEnd = (value: number) => { if (Number.isFinite(value)) onChange(start, Math.max(start + minimum, Math.min(value, buffer.duration, start + MAX_CLIP_SECONDS))); };
  const toggle = async () => {
    const audio = audioRef.current; if (!audio || !clipUrl) return;
    if (playing) { audio.pause(); onActiveChange(null); return; }
    audio.currentTime = 0; onActiveChange('clip-editor');
    try { await audio.play(); } catch { onActiveChange(null); }
  };
  return <section className="audio-clip-editor" aria-label={copy.clip}>
    <div className="audio-clip-heading"><div><Scissors size={16} /><h3>{copy.clip}</h3></div><span>{(end - start).toFixed(2)} / 40 s</span></div>
    <p>{copy.clipHint}</p>
    <div className="audio-clip-waveform" aria-hidden="true">
      <div className="audio-clip-selection" style={{ left: `${100 * start / buffer.duration}%`, width: `${100 * (end - start) / buffer.duration}%` }} />
      {peaks.map((peak, index) => <span key={index} style={{ height: `${Math.max(5, peak * 100)}%` }} className={index / peaks.length * buffer.duration >= start && index / peaks.length * buffer.duration <= end ? 'selected' : ''} />)}
    </div>
    <div className="audio-clip-timeline"><span>0:00</span><span>{copy.original} · {formatAudioTime(buffer.duration)}</span></div>
    <div className="audio-clip-inputs">
      <div><label htmlFor="clip-start">{copy.start}</label><input id="clip-start" aria-label={copy.start} type="number" min="0" max={Math.max(0, buffer.duration - minimum)} step="0.01" value={Number(start.toFixed(2))} onChange={event => changeStart(event.target.valueAsNumber)} disabled={disabled} /><input type="range" min="0" max={Math.max(0, buffer.duration - minimum)} step="0.01" value={start} aria-label={copy.startSlider} onChange={event => changeStart(Number(event.target.value))} disabled={disabled} /></div>
      <div><label htmlFor="clip-end">{copy.end}</label><input id="clip-end" aria-label={copy.end} type="number" min={start + minimum} max={Math.min(buffer.duration, start + MAX_CLIP_SECONDS)} step="0.01" value={Number(end.toFixed(2))} onChange={event => changeEnd(event.target.valueAsNumber)} disabled={disabled} /><input type="range" min={start + minimum} max={Math.min(buffer.duration, start + MAX_CLIP_SECONDS)} step="0.01" value={end} aria-label={copy.endSlider} onChange={event => changeEnd(Number(event.target.value))} disabled={disabled} /></div>
    </div>
    <div className="audio-clip-preview"><button type="button" onClick={() => void toggle()} disabled={disabled || !clipUrl}>{!clipUrl ? <LoaderCircle size={15} className="animate-spin" /> : playing ? <Pause size={15} /> : <Play size={15} />}{!clipUrl ? copy.preparing : playing ? copy.pauseClip : copy.previewClip}</button><span>{formatAudioTime(start)} → {formatAudioTime(end)}</span></div>
    <audio ref={audioRef} src={clipUrl || undefined} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); onActiveChange(null); }} onError={() => { setPlaying(false); onActiveChange(null); }} />
  </section>;
}
