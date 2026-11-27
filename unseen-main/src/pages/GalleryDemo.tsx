
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion, motionValue, useIsPresent, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Expand, Link2, LoaderCircle, Maximize, Menu as MenuIcon, Minimize, Pause, Play, X } from 'lucide-react';
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
type Exhibit = { id: string; title: string; artist: string; image: string; audio?: string };
type Copy = (typeof galleryDemoCopy)['it'];
type SoundCopy = (typeof musicCopy)['it'];

const exhibits: Record<Room, Exhibit[]> = {
  music: [
    { id: demoTracks[0].id, title: demoTracks[0].title, artist: demoTracks[0].artist, audio: demoTracks[0].audio_url, image: storm },
    { id: demoTracks[1].id, title: demoTracks[1].title, artist: demoTracks[1].artist, audio: demoTracks[1].audio_url, image: neonBloom },
    { id: 'smoked-glass', title: 'Vetro fumé', artist: 'OMBRA', image: glass, audio: glassAudio },
    { id: 'reflections', title: 'Riflessi', artist: 'ÉCO', image: reflection, audio: reflectionAudio },
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

  return <main className="gallery-demo" data-room={room} ref={screen} onPointerMove={event => {
    if (!reduced && event.pointerType === 'mouse') cameraX.set((event.clientX / window.innerWidth - 0.5) * -16);
  }} onPointerLeave={() => cameraX.set(0)}>
    <motion.img className="gallery-demo-stage-wall" src={wall} alt="" width={1440} height={810} fetchPriority="high" draggable={false}
      initial={reduced ? false : { scale: 1.18, opacity: 0 }} animate={{ scale: reduced ? 1 : 1.045, opacity: room === 'photo' ? 0.85 : 0.22 }}
      transition={{ duration: reduced ? 0 : 1.1, ease }} style={reduced ? undefined : { x: cameraX }} />
    <div className="gallery-demo-shell">
      <header className="gallery-demo-header">
        {room === 'photo' && <h1 className="sr-only">{copy.title}</h1>}
        <Link to="/admin" className="gallery-demo-logo" aria-label={copy.back} title={copy.back}>
          <img src="/unseen-logo-transparent.png" alt="" width={29} height={29} />
          {room === 'music' && <span aria-hidden="true">UNSEEN</span>}
        </Link>
        <div className="gallery-demo-mode" role="group" aria-label={copy.categories}>
          <button type="button" aria-pressed={room === 'music'} onClick={() => setRoom('music')}>{copy.music}</button>
          <button type="button" aria-pressed={room === 'photo'} onClick={() => setRoom('photo')}>{copy.photo}</button>
        </div>
        <div className="gallery-demo-header-actions">
          <LanguageSwitcher />
          <Menu.Root modal={false}>
            <Menu.Trigger className="gallery-demo-menu-trigger" aria-label={copy.menu}><MenuIcon size={24} strokeWidth={1.45} aria-hidden="true" /></Menu.Trigger>
            <Menu.Portal container={screen.current}>
              <Menu.Content className="gallery-demo-menu" align="end" sideOffset={7} collisionPadding={12}>
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
  const [viewport, carousel] = useEmblaCarousel({
    align: 'center', loop: true, containScroll: false, watchFocus: music, duration: reduced ? 0 : music ? 32 : 38,
  });
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

  const featured = music && selected.id === demoTracks[0].id;
  const info = <div className="gallery-demo-info">
    <motion.div className="gallery-demo-selection" key={selected.id} initial={reduced ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.36, ease }}>
      {featured && <p className="gallery-demo-kicker gallery-demo-featured-label">{copy.featured}</p>}
      <h2>{selected.title}</h2>
      <p className="gallery-demo-artist">{selected.artist}</p>
      {featured && <p className="gallery-demo-description">{copy.afterhours}</p>}
    </motion.div>

    <div className="gallery-demo-actions">
      {selected.audio && <Player key={selected.id} source={selected.audio} sound={sound} detailOpen={detailOpen}
        onPlayback={playing => setPlayingId(previous => playing ? selected.id : previous === selected.id ? null : previous)} />}
      <button type="button" className="gallery-demo-open" aria-label={copy.open} title={copy.open} onClick={event => onOpen(selected, event.currentTarget)}>
        <Expand size={17} aria-hidden="true" />
        {!selected.audio && copy.open}
      </button>
    </div>
  </div>;

  const galleryCarousel = <>
      <div className="gallery-demo-viewport" ref={viewport} tabIndex={0} role="region" aria-label={music ? copy.select : copy.wall} onKeyDown={navigate}>
        <ul className="gallery-demo-track" id="gallery-demo-works">
          {works.map((work, i) => <li className="gallery-demo-slide" key={work.id}>
            {music
              ? <ShelfSleeve work={work} distance={distances[i]} active={i === index} onSelect={() => carousel?.scrollTo(i, reduced)} />
              : <PhotoPrint work={work} distance={distances[i]} active={i === index} reduced={reduced}
                  label={i === index ? copy.open : copy.select} onClick={event => {
                    if (i === index) onOpen(work, event.currentTarget);
                    else carousel?.scrollTo(i, reduced);
                  }} />}
          </li>)}
        </ul>
      </div>
      <button type="button" className="gallery-demo-round gallery-demo-prev" aria-label={copy.previous} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollPrev(reduced)}>
        {music ? <ChevronLeft size={19} aria-hidden="true" /> : <ArrowLeft size={17} aria-hidden="true" />}
      </button>
      <button type="button" className="gallery-demo-round gallery-demo-next" aria-label={copy.next} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollNext(reduced)}>
        {music ? <ChevronRight size={19} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
      </button>
      <p className={music ? 'sr-only' : 'gallery-demo-position'} aria-live="polite">
        <span className="sr-only">{copy.position} </span>{formatIndex(index + 1)} <span>/</span> {formatIndex(works.length)}
      </p>
  </>;

  if (!music) return <section className="gallery-demo-exhibition gallery-demo-photo" aria-label={copy.photo}>
    <div className="gallery-demo-photo-wall">{galleryCarousel}</div>
    <div className="gallery-demo-photo-dock">
      {info}
      <ul className="gallery-demo-library" aria-label={copy.select}>
        {works.map((work, i) => <li key={work.id}>
          <button type="button" aria-pressed={i === index} onClick={() => carousel?.scrollTo(i, reduced)}>
            <img src={work.image} alt="" width={47} height={47} decoding="async" draggable={false} />
            <span><strong>{work.title}</strong><small>{work.artist}</small></span>
          </button>
        </li>)}
      </ul>
    </div>
  </section>;

  return <section className="gallery-demo-exhibition gallery-demo-music" aria-label={copy.music}>
    <div className="gallery-demo-hero">
      <div className="gallery-demo-intro">
        <p className="gallery-demo-kicker">{copy.collection}</p>
        <h1>{copy.title}<span aria-hidden="true">.</span></h1>
        <p>{copy.musicIntro}</p>
      </div>
      <div className="gallery-demo-stage">
        <div className="gallery-demo-orbit" aria-hidden="true" />
        <AnimatePresence>
          <FeaturedRecord key={selected.id} work={selected} playing={playingId === selected.id}
            reduced={reduced} label={copy.open} onClick={event => onOpen(selected, event.currentTarget)} />
        </AnimatePresence>
      </div>
      {info}
    </div>
    <div className="gallery-demo-floor">
      <Soundscape />
      <div className="gallery-demo-shelf">
        {galleryCarousel}
        <ul className="gallery-demo-pagination" aria-label={copy.select}>
          {works.map((work, i) => <li key={work.id}>
            <button type="button" aria-label={work.title} aria-pressed={i === index} onClick={() => carousel?.scrollTo(i, reduced)} />
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}

function Soundscape() {
  const surface = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = surface.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const columns = Math.ceil(width * 0.42 / 5);
      for (const side of [-1, 1]) {
        for (let column = 0; column < columns; column++) {
          const distance = column / columns;
          const x = side === -1 ? column * 5 : width - column * 5;
          for (let row = 0; row < 26; row++) {
            const depth = row / 25;
            const wave = Math.cos(distance * 8 + depth * 4 + side * 0.6);
            const y = height * (0.38 + depth * 0.38 - wave * (1 - distance) * 0.25);
            context.fillStyle = `rgba(222, 205, 188, ${(1 - distance) * (1 - depth * 0.72) * 0.34})`;
            context.fillRect(x + (row % 2) * 2.5, y, 0.8, 0.8);
          }
        }
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return <canvas className="gallery-demo-soundscape" ref={surface} aria-hidden="true" />;
}

function PhotoPrint({ work, distance, active, reduced, label, onClick }: {
  work: Exhibit; distance: MotionValue<number>; active: boolean; reduced: boolean;
  label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const scale = useTransform(distance, [-1.35, 0, 1.35], [0.66, 1, 0.66]);
  const opacity = useTransform(distance, [-1.35, 0, 1.35], [0.37, 1, 0.37]);
  const y = useTransform(distance, [-1.35, 0, 1.35], [51, 0, 51]);
  const rotateY = useTransform(distance, [-1.5, 0, 1.5], [37, 0, -37]);
  const rotateZ = useTransform(distance, [-1.5, 0, 1.5], [-5, 0, 5]);

  return <motion.div className="gallery-demo-print" data-active={active}
    style={reduced ? { opacity: active ? 1 : 0.48, scale: active ? 1 : 0.76 } : { scale, opacity, y, rotateY, rotateZ }}>
    <span className="gallery-demo-print-hook" aria-hidden="true" />
    <span className="gallery-demo-print-wire" aria-hidden="true" />
    <button type="button" className="gallery-demo-work" tabIndex={active ? 0 : -1}
      aria-label={`${label} ${work.title}`} onClick={onClick}>
      <span className="gallery-demo-object">
        <span className="gallery-demo-frame">
          <img src={work.image} alt="" width={510} height={510} decoding="async" draggable={false} />
        </span>
      </span>
    </button>
  </motion.div>;
}

function FeaturedRecord({ work, playing, reduced, label, onClick }: {
  work: Exhibit; playing: boolean; reduced: boolean;
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
          <motion.span className="gallery-demo-record" data-playing={playing}
            initial={reduced ? false : { x: '-7%', rotate: 12 }} animate={{ x: '-44%', rotate: -17 }}
            transition={reduced ? { duration: 0 } : { ...settle, delay: 0.14 }}>
              <span className="gallery-demo-disc">
                <img src={vinyl} alt="" draggable={false} decoding="async" width={512} height={512} />
                <span><img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} /></span>
              </span>
          </motion.span>
          <span className="gallery-demo-frame is-sleeve">
            <img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} />
          </span>
        </motion.span>
      </button>
  </motion.div>;
}

function ShelfSleeve({ work, active, distance, onSelect }: {
  work: Exhibit; active: boolean; distance: MotionValue<number>; onSelect: () => void;
}) {
  const rotateY = useTransform(distance, [-4, -2, -1, 0, 1, 2, 4], [-63, -54, -48, 0, 48, 54, 63]);
  const scale = useTransform(distance, [-4, -1, 0, 1, 4], [0.73, 0.88, 1, 0.88, 0.73]);
  const opacity = useTransform(distance, [-4, -1, 0, 1, 4], [0.38, 0.86, 1, 0.86, 0.38]);
  return <button type="button" className="gallery-demo-sleeve" aria-pressed={active} aria-label={work.title} onClick={onSelect}>
    <motion.span className="gallery-demo-sleeve-object" style={{ rotateY, scale }}>
      <motion.span className="gallery-demo-sleeve-face" style={{ opacity }}>
        <img src={work.image} alt="" width={240} height={240} decoding="async" draggable={false} />
      </motion.span>
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
    <audio ref={audio} src={source} preload="metadata"
      onPlaying={() => playback(true)} onPause={() => playback(false)} onEnded={() => playback(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} />
    <button type="button" className="gallery-demo-play" disabled={pending} aria-label={pending ? sound.loading : playing ? sound.pause : sound.play}
      title={playing ? sound.pause : sound.play} onClick={() => void toggle()}>
      {pending ? <LoaderCircle size={16} className="gallery-demo-spinner" aria-hidden="true" /> : playing ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
    </button>
    <div className="gallery-demo-transport">
      <span aria-hidden="true">{formatAudioTime(time)}</span>
      <input type="range" aria-label={sound.seek} min={0} max={duration || 1} value={Math.min(time, duration)}
        style={{ '--gallery-progress': `${duration ? Math.min(100, time / duration * 100) : 0}%` } as CSSProperties}
        step={0.05} disabled={!duration} onChange={event => {
          const value = Number(event.currentTarget.value);
          if (!audio.current) return;
          audio.current.currentTime = value;
          setTime(value);
        }} />
      <span aria-hidden="true">{duration ? formatAudioTime(duration) : '–:––'}</span>
    </div>
  </div>;
}
