
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Disc3, Expand, Image, Link2, LoaderCircle, LockKeyhole, Pause, Play, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nProvider';
import { galleryDemoCopy } from '@/i18n/gallery-demo-copy';
import { musicCopy } from '@/i18n/music-copy';
import { adminGalleryDemoPath } from '@/lib/auth-redirect';
import { demoTracks, formatAudioTime } from '@/lib/music';
import afterhours from '@/assets/gallery-demo/afterhours.webp';
import neonBloom from '@/assets/gallery-demo/neon-bloom.webp';
import glass from '@/assets/gallery-demo/vetro-fume.webp';
import reflection from '@/assets/gallery-demo/riflessi.webp';
import stillWater from '@/assets/gallery-demo/acqua-ferma.webp';
import spiral from '@/assets/gallery-demo/spirale.webp';
import winterSea from '@/assets/gallery-demo/mare-inverno.webp';
import loneTree from '@/assets/gallery-demo/albero.webp';
import vinyl from '@/assets/gallery-demo/disco.webp';
import wall from '@/assets/gallery-demo/parete-grafite.webp';
import glassAudio from '@/assets/gallery-demo/vetro-fume-estratto.wav';
import reflectionAudio from '@/assets/gallery-demo/riflessi-estratto.wav';
import '@/gallery-demo.css';

type Room = 'music' | 'photo';
type Exhibit = { id: string; title: string; artist: string; image: string; audio?: string };
type Copy = (typeof galleryDemoCopy)['it'];
type SoundCopy = (typeof musicCopy)['it'];

const exhibits: Record<Room, Exhibit[]> = {
  music: [
    { id: demoTracks[0].id, title: demoTracks[0].title, artist: demoTracks[0].artist, audio: demoTracks[0].audio_url, image: afterhours },
    { id: demoTracks[1].id, title: demoTracks[1].title, artist: demoTracks[1].artist, audio: demoTracks[1].audio_url, image: neonBloom },
    { id: 'smoked-glass', title: 'Vetro fumé', artist: 'OMBRA', image: glass, audio: glassAudio },
    { id: 'reflections', title: 'Riflessi', artist: 'ÉCO', image: reflection, audio: reflectionAudio },
  ],
  photo: [
    { id: 'still-water', title: 'Quota zero', artist: 'Luce Studio', image: stillWater },
    { id: 'spiral', title: 'Linee di fuga', artist: 'Ada Ferri', image: spiral },
    { id: 'winter-sea', title: 'Mare d’inverno', artist: 'Milo Riva', image: winterSea },
    { id: 'lone-tree', title: 'L’ultimo albero', artist: 'Luce Studio', image: loneTree },
  ],
};

const ease = [0.22, 1, 0.36, 1] as const;
const settle = { type: 'spring', stiffness: 187, damping: 21, mass: 0.82 } as const;
const formatIndex = (value: number) => String(value).padStart(2, '0');

export default function GalleryDemo() {
  const { locale } = useI18n();
  const copy = galleryDemoCopy[locale];
  const reduced = useReducedMotion() === true;
  const [room, setRoom] = useState<Room>('music');
  const [detail, setDetail] = useState<Exhibit | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(adminGalleryDemoPath, window.location.origin).href);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyError);
    }
  };

  return <main className="gallery-demo">
    <div className="gallery-demo-shell">
      <div className="gallery-demo-topline">
        <Link to="/admin"><ArrowLeft size={16} aria-hidden="true" />{copy.back}</Link>
        <div>
          <span><LockKeyhole size={12} aria-hidden="true" />{copy.private}</span>
          <button type="button" onClick={() => void copyLink()}><Link2 size={15} aria-hidden="true" />{copy.copy}</button>
        </div>
      </div>

      <header className="gallery-demo-header">
        <div>
          <h1>{copy.title}<span>.</span></h1>
          <p>{room === 'music' ? copy.musicIntro : copy.photoIntro}</p>
        </div>
        <div className="gallery-demo-mode" role="group" aria-label={copy.categories}>
          <button type="button" aria-pressed={room === 'music'} onClick={() => setRoom('music')}><Disc3 size={15} aria-hidden="true" />{copy.music}</button>
          <button type="button" aria-pressed={room === 'photo'} onClick={() => setRoom('photo')}><Image size={15} aria-hidden="true" />{copy.photo}</button>
        </div>
      </header>

      <GalleryRoom key={room} room={room} copy={copy} sound={musicCopy[locale]} reduced={reduced} detailOpen={detail !== null} onOpen={(work, button) => {
        opener.current = button;
        setDetail(work);
      }} />
    </div>

    <Dialog.Root open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="gallery-demo-overlay" />
        <Dialog.Content className="gallery-demo-detail" onCloseAutoFocus={event => {
          event.preventDefault();
          opener.current?.focus({ preventScroll: true });
        }}>
          {detail && <>
            <img src={detail.image} alt={detail.title} width={600} height={600} />
            <div>
              <Dialog.Title>{detail.title}</Dialog.Title>
              <Dialog.Description>{detail.artist} · {copy.sample}</Dialog.Description>
            </div>
          </>}
          <Dialog.Close className="gallery-demo-round gallery-demo-close" aria-label={copy.close}><X size={18} aria-hidden="true" /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </main>;
}

function GalleryRoom({ room, copy, sound, reduced, detailOpen, onOpen }: {
  room: Room;
  copy: Copy;
  sound: SoundCopy;
  reduced: boolean;
  detailOpen: boolean;
  onOpen: (work: Exhibit, button: HTMLButtonElement) => void;
}) {
  const works = exhibits[room];
  const music = room === 'music';
  const [viewport, carousel] = useEmblaCarousel({ align: 'center', loop: true, containScroll: false, watchFocus: false, duration: reduced ? 0 : 34 });
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const selected = works[index];

  useEffect(() => {
    if (!carousel) return;
    const sync = () => setIndex(carousel.selectedScrollSnap());
    sync();
    carousel.on('select', sync).on('reInit', sync);
    return () => { carousel.off('select', sync).off('reInit', sync); };
  }, [carousel]);

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); carousel?.scrollPrev(reduced); }
    if (event.key === 'ArrowRight') { event.preventDefault(); carousel?.scrollNext(reduced); }
  };

  return <section className="gallery-demo-exhibition" aria-label={copy.categories}>
    <div className="gallery-demo-stage" data-room={room}>
      <img className="gallery-demo-stage-wall" src={wall} alt="" width={1440} height={810} fetchPriority="high" draggable={false} />
      <div className="gallery-demo-viewport" ref={viewport} tabIndex={0} role="region" aria-label={copy.wall} onKeyDown={navigate}>
        <ul className="gallery-demo-track" id="gallery-demo-works">
          {works.map((work, i) => <li className="gallery-demo-slide" key={work.id}>
            <HangingWork work={work} music={music} active={i === index} playing={playingId === work.id}
              reduced={reduced} step={i} label={i === index ? copy.open : copy.select} onClick={event => {
                if (i === index) onOpen(work, event.currentTarget);
                else carousel?.scrollTo(i, reduced);
              }} />
          </li>)}
        </ul>
      </div>
      <button type="button" className="gallery-demo-round gallery-demo-prev" aria-label={copy.previous} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollPrev(reduced)}>
        <ArrowLeft size={19} aria-hidden="true" />
      </button>
      <button type="button" className="gallery-demo-round gallery-demo-next" aria-label={copy.next} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollNext(reduced)}>
        <ArrowRight size={19} aria-hidden="true" />
      </button>
      <p className="gallery-demo-position" aria-live="polite">
        <span className="sr-only">{copy.position} </span>{formatIndex(index + 1)} <span>/</span> {formatIndex(works.length)}
      </p>
    </div>

    <div className="gallery-demo-info">
      <motion.div className="gallery-demo-selection" key={selected.id} initial={reduced ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.36, ease }}>
        <h2>{selected.title}</h2>
        <p>{selected.artist}</p>
      </motion.div>

      {selected.audio && <Player key={selected.id} source={selected.audio} sound={sound} detailOpen={detailOpen}
        onPlayback={playing => setPlayingId(previous => playing ? selected.id : previous === selected.id ? null : previous)} />}
      <button type="button" className="gallery-demo-open" onClick={event => onOpen(selected, event.currentTarget)}>
        <Expand size={17} aria-hidden="true" />{copy.open}
      </button>
    </div>

    <ul className="gallery-demo-library" aria-label={copy.select}>
      {works.map((work, i) => <li key={work.id}>
        <button type="button" aria-pressed={i === index} aria-label={work.title} onClick={() => carousel?.scrollTo(i, reduced)}>
          <img src={work.image} alt="" width={56} height={56} loading="lazy" decoding="async" draggable={false} />
          <span><strong>{work.title}</strong><small>{work.artist}</small></span>
        </button>
      </li>)}
    </ul>
  </section>;
}

function HangingWork({ work, music, active, playing, reduced, step, label, onClick }: {
  work: Exhibit; music: boolean; active: boolean; playing: boolean; reduced: boolean; step: number;
  label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return <motion.div className="gallery-demo-installation"
    initial={reduced ? false : { opacity: 0, y: -33, rotate: step === 0 ? -5 : 4 }}
    animate={{ opacity: 1, y: 0, rotate: 0 }}
    transition={{ duration: reduced ? 0 : 0.82, delay: reduced ? 0 : 0.06 + step * 0.045, ease }}>
    <motion.div className="gallery-demo-hanging" data-active={active}
      animate={{ scale: reduced || active ? 1 : 0.78, opacity: active ? 1 : 0.47, y: reduced || active ? 0 : 16 }}
      transition={reduced ? { duration: 0 } : settle}>
      <span className="gallery-demo-anchor" aria-hidden="true" />
      <span className="gallery-demo-wire" aria-hidden="true" />
      <button type="button" className="gallery-demo-work" tabIndex={-1} aria-label={label + ' ' + work.title} onClick={onClick}>
        <motion.span className="gallery-demo-object" whileHover={reduced ? undefined : { rotateY: -8, rotateX: 5, y: -5 }} whileTap={reduced ? undefined : { scale: 0.985 }}
          transition={settle}>
          {music && <motion.span className="gallery-demo-record" data-playing={playing}
            initial={reduced ? false : { x: '9%', rotate: -12 }}
            animate={{ x: active ? '48%' : '19%', rotate: reduced ? 0 : active ? 16 : -8 }}
            transition={reduced ? { duration: 0 } : { ...settle, delay: active ? 0.16 : 0 }}>
            <span className="gallery-demo-disc">
              <img src={vinyl} alt="" draggable={false} decoding="async" width={512} height={512} />
              <span><img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} /></span>
            </span>
          </motion.span>}
          <span className={'gallery-demo-frame' + (music ? ' is-sleeve' : '')}>
            <img src={work.image} alt="" draggable={false} loading={step < 3 ? 'eager' : 'lazy'} decoding="async" width={510} height={510} />
          </span>
        </motion.span>
      </button>
    </motion.div>
  </motion.div>;
}

function Player({ source, sound, detailOpen, onPlayback }: {
  source: string; sound: SoundCopy; detailOpen: boolean; onPlayback: (active: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const player = audio.current;
    return () => player?.pause();
  }, []);

  useEffect(() => { if (detailOpen) audio.current?.pause(); }, [detailOpen]);

  const playback = (active: boolean) => {
    setPending(false);
    setPlaying(active);
    onPlayback(active);
  };

  const toggle = async () => {
    const player = audio.current;
    if (!player || pending) return;
    if (!player.paused) { player.pause(); return; }
    setPending(true);
    try {
      await player.play();
    } catch (error) {
      playback(false);
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(sound.audioError);
    }
  };

  return <div className="gallery-demo-player">
    <audio ref={audio} src={source} preload="none"
      onPlaying={() => playback(true)} onPause={() => playback(false)} onEnded={() => playback(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} />
    <button type="button" className="gallery-demo-play" disabled={pending} onClick={() => void toggle()}>
      {pending ? <LoaderCircle size={16} className="gallery-demo-spinner" aria-hidden="true" /> : playing ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
      {pending ? sound.loading : playing ? sound.pause : sound.play}
    </button>
    <div className="gallery-demo-transport">
      <input type="range" aria-label={sound.seek} min={0} max={duration || 1} value={Math.min(time, duration)}
        step={0.05} disabled={!duration} onChange={event => {
          const value = Number(event.currentTarget.value);
          if (!audio.current) return;
          audio.current.currentTime = value;
          setTime(value);
        }} />
      <span aria-hidden="true">{formatAudioTime(time)}</span>
    </div>
  </div>;
}
