
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion, motionValue, useIsPresent, useReducedMotion, useSpring, useTransform, type MotionStyle, type MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Expand, Link2, LoaderCircle, Maximize, Menu as MenuIcon, Minimize, Pause, Play, X } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { galleryDemoCopy } from '@/i18n/gallery-demo-copy';
import { musicCopy } from '@/i18n/music-copy';
import { adminGalleryDemoPath } from '@/lib/auth-redirect';
import { demoTracks, formatAudioTime } from '@/lib/music';
import afterhours from '@/assets/gallery-demo/afterhours.webp';
import storm from '@/assets/gallery-demo/afterhours-storm.webp';
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
type Exhibit = { id: string; title: string; artist: string; image: string; audio?: string; showRecordOnShelf?: boolean };
type Copy = (typeof galleryDemoCopy)['it'];
type SoundCopy = (typeof musicCopy)['it'];

const exhibits: Record<Room, Exhibit[]> = {
  music: [
    { id: demoTracks[0].id, title: demoTracks[0].title, artist: demoTracks[0].artist, audio: demoTracks[0].audio_url, image: storm },
    { id: demoTracks[1].id, title: demoTracks[1].title, artist: demoTracks[1].artist, audio: demoTracks[1].audio_url, image: neonBloom },
    { id: 'smoked-glass', title: 'Vetro fumé', artist: 'OMBRA', image: glass, audio: glassAudio },
    { id: 'reflections', title: 'Riflessi', artist: 'ÉCO', image: reflection, audio: reflectionAudio, showRecordOnShelf: true },
    { id: 'night-crossing', title: 'Passaggio notturno', artist: 'NOVA', image: afterhours },
    { id: 'grey-tide', title: 'Marea grigia', artist: 'Milo Riva', image: winterSea },
    { id: 'helix', title: 'Elica', artist: 'Ada Ferri', image: spiral },
    { id: 'quiet', title: 'Silenzio', artist: 'Luce Studio', image: loneTree },
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
  const [fullscreen, setFullscreen] = useState(false);
  const screen = useRef<HTMLElement | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const cameraX = useSpring(0, { stiffness: 95, damping: 22 });
  const nativeFullscreen = document.fullscreenEnabled === true;

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === screen.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === screen.current) await document.exitFullscreen();
      else await screen.current?.requestFullscreen();
    } catch { toast.error(copy.fullscreenError); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(adminGalleryDemoPath, window.location.origin).href);
      toast.success(copy.copied);
    } catch {
      toast.error(copy.copyError);
    }
  };

  return <main className="gallery-demo" ref={screen} onPointerMove={event => {
    if (!reduced && event.pointerType === 'mouse') cameraX.set((event.clientX / window.innerWidth - 0.5) * -16);
  }} onPointerLeave={() => cameraX.set(0)}>
    <motion.img className="gallery-demo-stage-wall" src={wall} alt="" width={1440} height={810} fetchPriority="high" draggable={false}
      initial={reduced ? false : { scale: 1.18, opacity: 0 }} animate={{ scale: reduced ? 1 : 1.045, opacity: 0.22 }}
      transition={{ duration: reduced ? 0 : 1.1, ease }} style={reduced ? undefined : { x: cameraX }} />
    <div className="gallery-demo-shell">
      <header className="gallery-demo-header">
        <h1 className="sr-only">{copy.title}</h1>
        <Link to="/admin" className="gallery-demo-logo" aria-label={copy.back} title={copy.back}>
          <img src="/unseen-logo-transparent.png" alt="UNSEEN" width={29} height={29} />
        </Link>
        <div className="gallery-demo-header-actions">
          <LanguageSwitcher />
          <Menu.Root modal={false}>
            <Menu.Trigger className="gallery-demo-menu-trigger" aria-label={copy.menu}><MenuIcon size={24} strokeWidth={1.45} aria-hidden="true" /></Menu.Trigger>
            <Menu.Portal container={screen.current}>
              <Menu.Content className="gallery-demo-menu" align="end" sideOffset={7} collisionPadding={12}>
                <Menu.RadioGroup aria-label={copy.categories} value={room} onValueChange={value => setRoom(value === 'photo' ? 'photo' : 'music')}>
                  <Menu.RadioItem value="music">{copy.music}<Menu.ItemIndicator><Check size={15} aria-hidden="true" /></Menu.ItemIndicator></Menu.RadioItem>
                  <Menu.RadioItem value="photo">{copy.photo}<Menu.ItemIndicator><Check size={15} aria-hidden="true" /></Menu.ItemIndicator></Menu.RadioItem>
                </Menu.RadioGroup>
                <Menu.Separator className="gallery-demo-menu-separator" />
                <Menu.Item onSelect={() => void copyLink()}>{copy.copy}<Link2 size={15} aria-hidden="true" /></Menu.Item>
                {nativeFullscreen && <Menu.Item onSelect={() => void toggleFullscreen()}>{fullscreen ? copy.exitFullscreen : copy.fullscreen}
                  {fullscreen ? <Minimize size={15} aria-hidden="true" /> : <Maximize size={15} aria-hidden="true" />}
                </Menu.Item>}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </header>

      <GalleryRoom key={room} room={room} copy={copy} sound={musicCopy[locale]} reduced={reduced} detailOpen={detail !== null} onOpen={(work, button) => {
        opener.current = button;
        setDetail(work);
      }} />
    </div>

    <Dialog.Root open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}>
      <Dialog.Portal container={screen.current}>
        <Dialog.Overlay className="gallery-demo-overlay" />
        <Dialog.Content className="gallery-demo-detail" onKeyDown={event => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          setDetail(null);
        }} onCloseAutoFocus={event => {
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
  const [viewport, carousel] = useEmblaCarousel({ align: 'center', loop: true, containScroll: false, duration: reduced ? 0 : 32 });
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [distances] = useState(() => works.map((_, i) => motionValue(i - Math.round(i / works.length) * works.length)));
  const selected = works[index];

  useEffect(() => {
    if (!carousel) return;
    const sync = () => setIndex(carousel.selectedScrollSnap());
    sync();
    carousel.on('select', sync).on('reInit', sync);
    return () => { carousel.off('select', sync).off('reInit', sync); };
  }, [carousel]);

  useEffect(() => {
    if (!carousel) return;
    let snaps = carousel.scrollSnapList();
    const follow = () => {
      const position = carousel.scrollProgress();
      const step = snaps[1] - snaps[0];
      if (!step) return;
      snaps.forEach((snap, i) => {
        // Embla normalizes a full lap to 1. Keep the nearest image of each slide at the wrap.
        const gap = snap - position;
        distances[i]?.set((gap - Math.round(gap)) / step);
      });
    };
    const resize = () => { snaps = carousel.scrollSnapList(); follow(); };
    follow();
    carousel.on('scroll', follow).on('select', follow).on('settle', follow).on('reInit', resize);
    return () => { carousel.off('scroll', follow).off('select', follow).off('settle', follow).off('reInit', resize); };
  }, [carousel, distances]);

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); carousel?.scrollPrev(reduced); }
    if (event.key === 'ArrowRight') { event.preventDefault(); carousel?.scrollNext(reduced); }
  };

  return <section className="gallery-demo-exhibition" data-room={room} aria-label={copy.categories}>
    <div className="gallery-demo-stage" data-room={room}>
      <AnimatePresence>
        <HangingWork key={selected.id} work={selected} music={music} playing={playingId === selected.id}
          reduced={reduced} label={copy.open} onClick={event => onOpen(selected, event.currentTarget)} />
      </AnimatePresence>
    </div>

    <div className="gallery-demo-info">
      <motion.div className="gallery-demo-selection" key={`title-${selected.id}`} initial={reduced ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.36, ease }}>
        <h2>{selected.title}</h2>
        <p>{selected.artist}</p>
      </motion.div>

      {selected.audio && <Player key={`audio-${selected.id}`} source={selected.audio} sound={sound} detailOpen={detailOpen}
        onPlayback={playing => setPlayingId(previous => playing ? selected.id : previous === selected.id ? null : previous)} />}
      {!selected.audio && <button type="button" className="gallery-demo-open" aria-label={copy.open} title={copy.open} onClick={event => onOpen(selected, event.currentTarget)}>
        <Expand size={17} aria-hidden="true" />
      </button>}
    </div>

    <motion.div className="gallery-demo-shelf" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : 0.22, ease }}>
      <div className="gallery-demo-viewport" ref={viewport} tabIndex={0} role="region" aria-label={copy.select} onKeyDown={navigate}>
        <ul className="gallery-demo-track" id="gallery-demo-works">
          {works.map((work, i) => <li className="gallery-demo-slide" key={work.id}>
            <ShelfSleeve work={work} distance={distances[i]} active={i === index} onSelect={() => carousel?.scrollTo(i, reduced)} />
          </li>)}
        </ul>
      </div>
      <button type="button" className="gallery-demo-round gallery-demo-prev" aria-label={copy.previous} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollPrev(reduced)}>
        <ArrowLeft size={17} aria-hidden="true" />
      </button>
      <button type="button" className="gallery-demo-round gallery-demo-next" aria-label={copy.next} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollNext(reduced)}>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
      <p className="gallery-demo-position sr-only" aria-live="polite">
        <span className="sr-only">{copy.position} </span>{formatIndex(index + 1)} <span>/</span> {formatIndex(works.length)}
      </p>
    </motion.div>
  </section>;
}

function HangingWork({ work, music, playing, reduced, label, onClick }: {
  work: Exhibit; music: boolean; playing: boolean; reduced: boolean;
  label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const present = useIsPresent();
  return <motion.div className="gallery-demo-installation" aria-hidden={!present || undefined}
    initial={reduced ? false : { opacity: 0, x: 34, y: 12, scale: 0.91, rotateY: -13 }}
    animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotateY: 0 }}
    exit={reduced ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.94, transition: { duration: 0.18, ease } }}
    transition={reduced ? { duration: 0 } : { ...settle, opacity: { duration: 0.4 } }}>
      <button type="button" className="gallery-demo-work" disabled={!present} aria-label={`${label} ${work.title}`} onClick={onClick}>
        <motion.span className="gallery-demo-object" tabIndex={-1} whileHover={reduced ? undefined : { rotateY: -8, rotateX: 5, y: -5 }} whileTap={reduced ? undefined : { scale: 0.985 }}
          transition={settle}>
          {music && <motion.span className="gallery-demo-record" data-playing={playing}
            initial={reduced ? false : { x: '-7%', rotate: 12 }} animate={{ x: '-44%', rotate: -17 }}
            transition={reduced ? { duration: 0 } : { ...settle, delay: 0.14 }}>
              <span className="gallery-demo-disc">
                <img src={vinyl} alt="" draggable={false} decoding="async" width={512} height={512} />
                <span><img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} /></span>
              </span>
          </motion.span>}
          <span className={'gallery-demo-frame' + (music ? ' is-sleeve' : '')}>
            <img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} />
          </span>
        </motion.span>
      </button>
  </motion.div>;
}

function ShelfSleeve({ work, active, distance, onSelect }: {
  work: Exhibit; active: boolean; distance: MotionValue<number>; onSelect: () => void;
}) {
  const yaw = useTransform(distance, [-4, -2, -0.6, 0, 0.6, 2, 4], ['33deg', '25deg', '8deg', '0deg', '-8deg', '-25deg', '-33deg']);
  const light = useTransform(distance, [-4, 0, 4], [0.47, 1, 0.47]);
  return <button type="button" className="gallery-demo-sleeve" aria-pressed={active} aria-label={work.title} onClick={onSelect}>
    <motion.span className="gallery-demo-sleeve-object" style={{ '--sleeve-yaw': yaw } as MotionStyle}>
      {work.showRecordOnShelf && <img className="gallery-demo-shelf-record" src={vinyl} alt="" width={200} height={200} loading="lazy" decoding="async" draggable={false} />}
      <motion.span className="gallery-demo-sleeve-face" style={{ opacity: light }}><img src={work.image} alt="" width={240} height={240} loading="lazy" decoding="async" draggable={false} /></motion.span>
      <span className="gallery-demo-sleeve-back"><img src={work.image} alt="" width={240} height={240} loading="lazy" decoding="async" draggable={false} /></span>
      <span className="gallery-demo-spine gallery-demo-spine-left" aria-hidden="true">{work.title}</span>
      <span className="gallery-demo-spine gallery-demo-spine-right" aria-hidden="true">{work.title}</span>
    </motion.span>
  </button>;
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
    <button type="button" className="gallery-demo-play" disabled={pending} aria-label={pending ? sound.loading : playing ? sound.pause : sound.play}
      title={playing ? sound.pause : sound.play} onClick={() => void toggle()}>
      {pending ? <LoaderCircle size={16} className="gallery-demo-spinner" aria-hidden="true" /> : playing ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
    </button>
    <div className="gallery-demo-transport" hidden={!duration}>
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
