import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Disc3, Ellipsis, Heart, Link2, Award, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { galleryDemoCopy } from '@/i18n/gallery-demo-copy';
import type { musicCopy } from '@/i18n/music-copy';
import { formatAudioTime } from '@/lib/music';
import { useGalleryTransport } from '@/hooks/useGalleryTransport';
import MusicWaveform from './MusicWaveform';
import chassis from '@/assets/gallery-demo/turntable-chassis.webp';
import tonearm from '@/assets/gallery-demo/turntable-tonearm.webp';
import vinyl from '@/assets/gallery-demo/disco.webp';

type Work = { id: string; title: string; artist: string; image: string; audio?: string };
type Props = {
  works: Work[];
  copy: (typeof galleryDemoCopy)['it'];
  sound: (typeof musicCopy)['it'];
  startIndex: number;
  reduced: boolean;
  detailOpen: boolean;
  menuContainer: HTMLElement | null;
  favorites: string[];
  onOpen: (work: Work, button: HTMLButtonElement) => void;
  onFavorite: (id: string) => void;
  onShare: (id: string) => void;
};

// The opening pair follows the red and blue portrait treatment of the reference.
const lighting: Record<string, string> = {
  'demo-1': '#ae3f31', 'demo-2': '#326bb0', 'smoked-glass': '#bf512a',
  reflections: '#df7438', 'night-crossing': '#ce6337', 'grey-tide': '#747e86',
  helix: '#93928e', quiet: '#948c80',
};

function CoverArt({ work, lazy = false }: { work: Work; lazy?: boolean }) {
  return <span className="record-art" data-portrait={work.id === 'demo-1' || work.id === 'demo-2'}
    style={{ '--art-color': lighting[work.id] } as CSSProperties}>
    <img src={work.image} alt="" draggable={false} loading={lazy ? 'lazy' : 'eager'} />
  </span>;
}

function FeaturedRecord({ work, spinning, reduced, openLabel, winnerLabel, onOpen }: {
  work: Work; spinning: boolean; reduced: boolean; openLabel: string; winnerLabel: string; onOpen: Props['onOpen'];
}) {
  const disc = useRef<HTMLSpanElement>(null);
  const speed = useRef(0);
  useLayoutEffect(() => {
    // Keep the original CSS keyframes and 5.2s revolution. Braking only changes
    // playback rate, so pausing and restarting retain the groove's exact angle.
    const spin = disc.current?.getAnimations().find(a => (a as CSSAnimation).animationName === 'gallery-demo-spin');
    if (!spin) return;
    if (reduced) { spin.pause(); speed.current = 0; return; }
    const from = speed.current;
    const to = spinning ? 1 : 0;
    if (from === to) return;
    const start = performance.now();
    let frame = 0;
    spin.play();
    const ramp = (now: number) => {
      const t = Math.min(1, (now - start) / (spinning ? 370 : 310));
      speed.current = from + (to - from) * t * (2 - t);
      spin.updatePlaybackRate(speed.current);
      if (t < 1) frame = requestAnimationFrame(ramp);
      else if (!spinning) spin.pause();
    };
    ramp(start);
    return () => cancelAnimationFrame(frame);
  }, [spinning, reduced]);

  // A single coordinate system keeps the hardware registered as the stage
  // resizes. Only the carriage, rotating surface and cue arm can move.
  return <div className="record-deck">
    <button type="button" className="record-jacket" aria-label={openLabel + ' ' + work.title}
      onClick={e => onOpen(work, e.currentTarget)}>
      <span key={work.id} className="record-jacket-face"><CoverArt work={work} /></span>
      <span className="record-award" aria-hidden="true"><Award />{winnerLabel}</span>
    </button>
    <img className="record-chassis" src={chassis} alt="" draggable={false} width={888} height={243} />
    <div className="record-carriage" aria-hidden="true">
      <div className="record-plane">
        <span className="gallery-demo-disc" ref={disc}>
          <img src={vinyl} alt="" draggable={false} width={512} height={512} />
          <span className="record-label"><img src={work.image} alt="" draggable={false} /></span>
        </span>
        <span className="record-reflection" />
      </div>
    </div>
    <img className="record-tonearm" src={tonearm} alt="" draggable={false} width={216} height={126} />
  </div>;
}

export default function GalleryMusicRoom({ works, copy, sound, reduced, startIndex, detailOpen, menuContainer, favorites, onOpen, onFavorite, onShare }: Props) {
  const transport = useGalleryTransport(works, startIndex, reduced, sound.audioError);
  const { index, phase, audio, stop, wantsPlay } = transport;
  const work = works[index];
  const [expanded, setExpanded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const rail = useRef<HTMLUListElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useEffect(() => { if (detailOpen) stop(); }, [detailOpen, stop]);
  useEffect(() => {
    for (const offset of [-1, 1]) {
      const img = new Image();
      img.src = works[(index + offset + works.length) % works.length].image;
      void img.decode?.().catch(() => {});
    }
  }, [index, works]);
  useEffect(() => {
    const list = rail.current;
    const card = list?.children[index] as HTMLElement | undefined;
    if (card && list && !expanded) {
      const left = card.offsetLeft - list.offsetLeft;
      if (left < list.scrollLeft || left + card.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollTo({ left: left - (list.clientWidth - card.offsetWidth) / 2, behavior: reduced ? 'instant' : 'smooth' });
      }
    }
  }, [index, expanded, reduced]);
  useLayoutEffect(() => { setTime(0); setDuration(0); }, [work.id]);

  const tint = lighting[work.id] ?? '#a77763';
  const favorite = favorites.includes(work.id);
  const open = (item: Work, button: HTMLButtonElement) => { stop(); onOpen(item, button); };
  return <section className="gallery-demo-music listening-room" data-phase={phase} data-wants-play={wantsPlay} aria-label={copy.musicLabel}
    style={{ '--sleeve-tint': tint } as CSSProperties}>
    <div className="listening-atmosphere" aria-hidden="true" />
    <div className="listening-hero">
      <div className="listening-heading">
        <h1>{copy.title}<b aria-hidden="true">.</b><small>{copy.qualifier}</small></h1>
      </div>
      <div className="listening-stage" onTouchStart={e => {
        swiped.current = false;
        touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={e => {
        const start = touch.current;
        touch.current = null;
        if (!start || e.touches.length) return;
        const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          swiped.current = true;
          transport.skip(dx < 0 ? 1 : -1);
        }
      }} onClickCapture={e => {
        if (swiped.current) { e.stopPropagation(); swiped.current = false; }
      }}>
        <FeaturedRecord work={work} spinning={phase === 'playing'} reduced={reduced} openLabel={copy.open} winnerLabel={copy.winner} onOpen={open} />
      </div>
      <button type="button" className="deck-step deck-back" aria-label={copy.previous} onClick={() => transport.skip(-1)}><ChevronLeft /></button>
      <button type="button" className="deck-step deck-next" aria-label={copy.next} onClick={() => transport.skip(1)}><ChevronRight /></button>
    </div>
    <div className="listening-player">
      <audio ref={audio} src={work.audio || undefined} preload="metadata" {...transport.mediaEvents}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} />
      <button type="button" className="listening-track-info" onClick={e => open(work, e.currentTarget)} aria-label={copy.open + ' ' + work.title}>
        <CoverArt work={work} /><span aria-live="polite" aria-atomic="true"><span key={work.id}><strong>{work.title}</strong><small>{work.artist}</small></span></span>
      </button>
      <div className="listening-controls">
        <button type="button" aria-label={copy.previous} onClick={() => transport.skip(-1)}><SkipBack /></button>
        <button type="button" className="listening-play" aria-label={wantsPlay ? sound.pause : sound.play} disabled={!work.audio}
          aria-pressed={wantsPlay} onClick={transport.toggle}>{wantsPlay ? <Pause /> : <Play />}</button>
        <button type="button" aria-label={copy.next} onClick={() => transport.skip(1)}><SkipForward /></button>
      </div>
      {work.audio ? <div className="listening-seek">
        <MusicWaveform signal={reduced ? null : transport.signal} appearance="arena" />
        <span>{formatAudioTime(time)} <i>/</i> {duration ? formatAudioTime(duration) : '–:––'}</span>
        <div className="gallery-demo-transport">
          <input type="range" min={0} max={duration || 1} step={0.05} disabled={!duration}
            aria-label={sound.seek} aria-valuetext={formatAudioTime(time)} value={Math.min(time, duration)}
            style={{ '--gallery-progress': (duration ? time / duration * 100 : 0) + '%' } as CSSProperties}
            onChange={e => { if (audio.current) audio.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }} />
        </div>
      </div> : <p className="listening-unavailable">{copy.noExcerpt}</p>}
      <Menu.Root modal={false}>
        <Menu.Trigger className="listening-options" aria-label={copy.workOptions}><Ellipsis size={21} /></Menu.Trigger>
        <Menu.Portal container={menuContainer}><Menu.Content className="gallery-demo-menu" sideOffset={6} align="end">
          <Menu.CheckboxItem checked={favorite} onCheckedChange={() => onFavorite(work.id)}>{copy.favorite}{favorite ? <Check size={15} /> : <Heart size={15} />}</Menu.CheckboxItem>
          <Menu.Item onSelect={() => onShare(work.id)}>{copy.copy}<Link2 size={15} /></Menu.Item>
        </Menu.Content></Menu.Portal>
      </Menu.Root>
    </div>
    <section className="listening-collection" aria-labelledby="gallery-winners">
      <header><h2 id="gallery-winners">{copy.winners}</h2>
        <div className="listening-browse"><span>{String(index + 1).padStart(2, '0')} <i>/</i> {String(works.length).padStart(2, '0')}</span>
          <button aria-label={copy.previous} onClick={() => transport.skip(-1)}><ChevronLeft size={17} /></button>
          <button aria-label={copy.next} onClick={() => transport.skip(1)}><ChevronRight size={17} /></button>
        </div>
      </header>
      <ul id="music-winners" className="listening-cards" ref={rail} data-expanded={expanded}>
        {works.map((item, i) => <li key={item.id}>
          <button type="button" aria-pressed={index === i} aria-label={copy.select + ' · ' + item.title + ' · ' + item.artist}
            onKeyDown={e => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + works.length) % works.length;
              rail.current?.children[next]?.querySelector('button')?.focus({ preventScroll: true });
              transport.select(next);
            }}
            onClick={() => transport.select(i)}>
            <CoverArt work={item} lazy={i >= 4} />
            <span className="listening-card-caption"><strong>{item.title}</strong><small>{item.artist}</small></span>
            <span className="listening-card-icon">{index === i ? <Disc3 size={18} /> : <ArrowUpRight size={16} />}</span>
          </button>
        </li>)}
      </ul>
      <button type="button" className="listening-expand" aria-expanded={expanded} aria-controls="music-winners" onClick={() => setExpanded(!expanded)}>
        {expanded ? copy.collapse : copy.viewAll}{expanded ? <ArrowDown size={16} style={{ rotate: '180deg' }} /> : <ArrowRight size={16} />}
      </button>
    </section>
  </section>;
}
