import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowLeftRight, ChevronDown, LoaderCircle, Pause, Play, Scissors } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { musicSubmitCopy } from '@/i18n/music-submit-copy';
import { MAX_CLIP_SECONDS, waveformPeaks, type AudioSource } from '@/lib/audio-clip';
import { formatAudioTime } from '@/lib/music';

type Props = { buffer: AudioSource; start: number; end: number; onChange: (start: number, end: number) => void; clipUrl: string; activeId: string | null; onActiveChange: (id: string | null) => void; disabled: boolean };
type DragMode = 'move' | 'start' | 'end';
type Drag = { mode: DragMode; pointerId: number; x: number; width: number; start: number; end: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function AudioClipEditor({ buffer, start, end, onChange, clipUrl, activeId, onActiveChange, disabled }: Props) {
  const { locale } = useI18n(); const copy = musicSubmitCopy[locale];
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const peaks = useMemo(() => waveformPeaks(buffer), [buffer]);
  const minimum = Math.min(.1, buffer.duration);
  const length = end - start;
  const moveSelection = (value: number) => {
    const next = clamp(value, 0, buffer.duration - length);
    onChange(next, Math.min(buffer.duration, next + length));
  };
  useEffect(() => { if (activeId !== 'clip-editor') audioRef.current?.pause(); }, [activeId]);
  useEffect(() => {
    audioRef.current?.pause();
    setPlaying(false); setPosition(0);
  }, [clipUrl, start, end]);
  useEffect(() => { const element = audioRef.current; return () => element?.pause(); }, []);

  // Trackpad gestures and Shift + wheel move the excerpt; vertical page scrolling stays native.
  useEffect(() => {
    const waveform = waveformRef.current;
    if (!waveform || disabled) return;
    const scroll = (event: WheelEvent) => {
      if (event.ctrlKey || drag.current) return;
      const delta = event.shiftKey ? event.deltaY || event.deltaX : event.deltaX;
      if (!delta || (!event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX))) return;
      event.preventDefault();
      const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? waveform.clientWidth : 1);
      const next = clamp(start + pixels / Math.max(1, waveform.clientWidth) * buffer.duration, 0, buffer.duration - length);
      onChange(next, Math.min(buffer.duration, next + length));
    };
    waveform.addEventListener('wheel', scroll, { passive: false });
    return () => waveform.removeEventListener('wheel', scroll);
  }, [buffer.duration, disabled, start, length, onChange]);

  const beginDrag = (event: PointerEvent<HTMLElement>, mode: DragMode, jump = false) => {
    if (disabled || !event.isPrimary || event.button !== 0 || drag.current) return;
    const waveform = waveformRef.current;
    if (!waveform) return;
    event.stopPropagation();
    const bounds = waveform.getBoundingClientRect();
    if (!bounds.width) return;
    const nextStart = jump ? clamp((event.clientX - bounds.left) / bounds.width * buffer.duration - length / 2, 0, buffer.duration - length) : start;
    drag.current = { mode, pointerId: event.pointerId, x: event.clientX, width: bounds.width, start: nextStart, end: nextStart + length };
    setDragging(mode);
    waveform.setPointerCapture(event.pointerId);
    if (jump) onChange(nextStart, Math.min(buffer.duration, nextStart + length));
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId || disabled) return;
    const delta = (event.clientX - current.x) / current.width * buffer.duration;
    if (current.mode === 'move') {
      const from = clamp(current.start + delta, 0, buffer.duration - (current.end - current.start));
      onChange(from, Math.min(buffer.duration, from + current.end - current.start));
    } else if (current.mode === 'start') {
      onChange(clamp(current.start + delta, Math.max(0, current.end - MAX_CLIP_SECONDS), current.end - minimum), current.end);
    } else {
      onChange(current.start, clamp(current.end + delta, current.start + minimum, Math.min(buffer.duration, current.start + MAX_CLIP_SECONDS)));
    }
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null; setDragging(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keySelection = (event: KeyboardEvent<HTMLElement>, mode: DragMode) => {
    if (disabled) return;
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault(); event.stopPropagation();
    const min = mode === 'end' ? start + minimum : mode === 'start' ? Math.max(0, end - MAX_CLIP_SECONDS) : 0;
    const max = mode === 'end' ? Math.min(buffer.duration, start + MAX_CLIP_SECONDS) : mode === 'start' ? end - minimum : buffer.duration - length;
    const value = event.key === 'Home' ? min : event.key === 'End' ? max : clamp((mode === 'end' ? end : start) + direction * (event.shiftKey ? 5 : 1), min, max);
    if (mode === 'move') moveSelection(value);
    else if (mode === 'start') onChange(value, end);
    else onChange(start, value);
  };
  const changeStart = (value: number) => {
    if (!Number.isFinite(value)) return;
    const nextStart = clamp(value, 0, buffer.duration - minimum);
    onChange(nextStart, Math.min(buffer.duration, nextStart + Math.min(MAX_CLIP_SECONDS, length)));
  };
  const changeEnd = (value: number) => { if (Number.isFinite(value)) onChange(start, clamp(value, start + minimum, Math.min(buffer.duration, start + MAX_CLIP_SECONDS))); };
  const toggle = async () => {
    const audio = audioRef.current; if (!audio || !clipUrl) return;
    if (playing) { audio.pause(); onActiveChange(null); return; }
    audio.currentTime = 0; setPosition(0); onActiveChange('clip-editor');
    try { await audio.play(); } catch { onActiveChange(null); }
  };
  const rangeText = `${formatAudioTime(start)} – ${formatAudioTime(end)}`;
  return <section className="audio-clip-editor" aria-label={copy.clip}>
    <div className="audio-clip-heading"><div><Scissors size={16} /><h3>{copy.clip}</h3></div><span>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(length)} / 40 s</span></div>
    <p>{copy.clipHint}</p>
    <div ref={waveformRef} className={`audio-clip-waveform ${dragging ? `is-dragging is-dragging-${dragging}` : ''}`} aria-disabled={disabled} onPointerDown={event => beginDrag(event, 'move', true)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
      <div className="audio-clip-bars" aria-hidden="true">{peaks.map((peak, index) => <span key={index} style={{ height: `${Math.max(5, peak * 100)}%` }} className={index / peaks.length * buffer.duration >= start && index / peaks.length * buffer.duration < end ? 'selected' : ''} />)}</div>
      <div className="audio-clip-selection" style={{ left: `${100 * start / buffer.duration}%`, width: `${100 * length / buffer.duration}%` }}>
        <div className="audio-clip-move" role="slider" tabIndex={disabled ? -1 : 0} aria-label={copy.moveClip} aria-disabled={disabled} aria-valuemin={0} aria-valuemax={buffer.duration - length} aria-valuenow={start} aria-valuetext={rangeText} onPointerDown={event => beginDrag(event, 'move')} onKeyDown={event => keySelection(event, 'move')} />
        <div className="audio-clip-handle is-start" role="slider" tabIndex={disabled ? -1 : 0} aria-label={copy.startSlider} aria-disabled={disabled} aria-valuemin={Math.max(0, end - MAX_CLIP_SECONDS)} aria-valuemax={end - minimum} aria-valuenow={start} aria-valuetext={formatAudioTime(start)} onPointerDown={event => beginDrag(event, 'start')} onKeyDown={event => keySelection(event, 'start')}><span /></div>
        <div className="audio-clip-handle is-end" role="slider" tabIndex={disabled ? -1 : 0} aria-label={copy.endSlider} aria-disabled={disabled} aria-valuemin={start + minimum} aria-valuemax={Math.min(buffer.duration, start + MAX_CLIP_SECONDS)} aria-valuenow={end} aria-valuetext={formatAudioTime(end)} onPointerDown={event => beginDrag(event, 'end')} onKeyDown={event => keySelection(event, 'end')}><span /></div>
      </div>
      {playing && <div className="audio-clip-playhead" aria-hidden="true" style={{ left: `${100 * (start + Math.min(position, length)) / buffer.duration}%` }} />}
    </div>
    <div className="audio-clip-timeline"><span>0:00</span><span>{copy.original} · {formatAudioTime(buffer.duration)}</span></div>
    <div className="audio-clip-gesture-hint"><ArrowLeftRight size={13} aria-hidden="true" /><span>{copy.dragClip}</span></div>
    <div className="audio-clip-preview"><button type="button" onClick={() => void toggle()} disabled={disabled || !clipUrl}>{!clipUrl ? <LoaderCircle size={15} className="animate-spin" /> : playing ? <Pause size={15} /> : <Play size={15} />}{!clipUrl ? copy.preparing : playing ? copy.pauseClip : copy.previewClip}</button><span aria-label={copy.selected}>{rangeText}</span></div>
    <details className="audio-clip-precision"><summary>{copy.exactTiming}<ChevronDown size={13} aria-hidden="true" /></summary><div className="audio-clip-inputs">
      <div><label htmlFor="clip-start">{copy.start}</label><input id="clip-start" type="number" min="0" max={Math.max(0, buffer.duration - minimum)} step="0.01" value={Number(start.toFixed(2))} onChange={event => changeStart(event.target.valueAsNumber)} disabled={disabled} /></div>
      <div><label htmlFor="clip-end">{copy.end}</label><input id="clip-end" type="number" min={start + minimum} max={Math.min(buffer.duration, start + MAX_CLIP_SECONDS)} step="0.01" value={Number(end.toFixed(2))} onChange={event => changeEnd(event.target.valueAsNumber)} disabled={disabled} /></div>
    </div></details>
    <audio ref={audioRef} src={clipUrl || undefined} preload="metadata" onTimeUpdate={event => setPosition(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPosition(0); onActiveChange(null); }} onError={() => { setPlaying(false); onActiveChange(null); }} />
  </section>;
}
