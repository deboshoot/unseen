import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Disc3, Image, Link2, LockKeyhole, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nProvider';
import { galleryDemoCopy } from '@/i18n/gallery-demo-copy';
import { adminGalleryDemoPath } from '@/lib/auth-redirect';
import { demoTracks } from '@/lib/music';
import afterhours from '@/assets/gallery-demo/afterhours.webp';
import neonBloom from '@/assets/gallery-demo/neon-bloom.webp';
import glass from '@/assets/gallery-demo/vetro-fume.webp';
import reflection from '@/assets/gallery-demo/riflessi.webp';
import stillWater from '@/assets/gallery-demo/acqua-ferma.webp';
import spiral from '@/assets/gallery-demo/spirale.webp';
import winterSea from '@/assets/gallery-demo/mare-inverno.webp';
import loneTree from '@/assets/gallery-demo/albero.webp';
import vinyl from '@/assets/gallery-demo/disco.webp';
import '@/gallery-demo.css';

type Room = 'music' | 'photo';
type Exhibit = { id: string; title: string; artist: string; image: string; audio?: string };
type Copy = (typeof galleryDemoCopy)['it'];

const exhibits: Record<Room, Exhibit[]> = {
  music: [
    { id: demoTracks[0].id, title: demoTracks[0].title, artist: demoTracks[0].artist, audio: demoTracks[0].audio_url, image: afterhours },
    { id: demoTracks[1].id, title: demoTracks[1].title, artist: demoTracks[1].artist, audio: demoTracks[1].audio_url, image: neonBloom },
    { id: 'smoked-glass', title: 'Vetro fumé', artist: 'OMBRA', image: glass },
    { id: 'reflections', title: 'Riflessi', artist: 'ÉCO', image: reflection },
  ],
  photo: [
    { id: 'still-water', title: 'Acqua ferma', artist: 'Luce Studio', image: stillWater },
    { id: 'spiral', title: 'Spirale', artist: 'Ada Ferri', image: spiral },
    { id: 'winter-sea', title: 'Mare d’inverno', artist: 'Milo Riva', image: winterSea },
    { id: 'lone-tree', title: 'L’ultimo albero', artist: 'Luce Studio', image: loneTree },
  ],
};

const spring = { stiffness: 240, damping: 29, mass: 0.8 };
const settleSwing = { stiffness: 145, damping: 15, mass: 0.85 };
const entranceEase = [0.22, 1, 0.36, 1] as const;
const formatPosition = (position: number) => String(position).padStart(2, '0');

export default function GalleryDemo() {
  const { locale } = useI18n();
  const copy = galleryDemoCopy[locale];
  const reduceMotion = useReducedMotion() === true;
  const [room, setRoom] = useState<Room>('music');
  const [selected, setSelected] = useState<Exhibit | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const musicRoom = room === 'music';

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
        <Link to="/admin"><ArrowLeft size={15} aria-hidden="true" />{copy.back}</Link>
        <div>
          <span><LockKeyhole size={13} aria-hidden="true" />{copy.private}</span>
          <button type="button" onClick={() => void copyLink()}><Link2 size={15} aria-hidden="true" />{copy.copy}</button>
        </div>
      </div>

      <motion.header className="gallery-demo-hero" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.55, ease: entranceEase }}>
        <h1>{musicRoom ? copy.musicTitle : copy.photoTitle} <em>{musicRoom ? copy.musicEmphasis : copy.photoEmphasis}</em></h1>
        <p>{musicRoom ? copy.musicIntro : copy.photoIntro}</p>
      </motion.header>

      <Wall room={room} copy={copy} reduceMotion={reduceMotion} onRoomChange={setRoom} onOpen={(work, button) => {
        trigger.current = button;
        setSelected(work);
      }} />
    </div>

    <Dialog.Root open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="gallery-demo-overlay" />
        <Dialog.Content className="gallery-demo-dialog" onCloseAutoFocus={event => {
          event.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}>
          {selected && <>
            <img className="gallery-demo-dialog-image" src={selected.image} alt={selected.title} width={510} height={510} />
            <div className="gallery-demo-dialog-info">
              <p className="gallery-demo-label">{copy.sample}</p>
              <Dialog.Title>{selected.title}</Dialog.Title>
              <Dialog.Description>{selected.artist}</Dialog.Description>
              {selected.audio ? <audio controls preload="none" src={selected.audio} aria-label={`${copy.audio}: ${selected.title}`} />
                : musicRoom && <p className="gallery-demo-no-audio">{copy.noAudio}</p>}
            </div>
          </>}
          <Dialog.Close className="gallery-demo-icon gallery-demo-close" aria-label={copy.close}><X size={20} aria-hidden="true" /></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </main>;
}

function Wall({ room, copy, reduceMotion, onRoomChange, onOpen }: {
  room: Room;
  copy: Copy;
  reduceMotion: boolean;
  onRoomChange: (room: Room) => void;
  onOpen: (work: Exhibit, button: HTMLButtonElement) => void;
}) {
  const works = exhibits[room];
  const [viewport, carousel] = useEmblaCarousel({ align: 'start', duration: reduceMotion ? 0 : 30, skipSnaps: false });
  const [page, setPage] = useState({ index: 0, count: 0 });
  const { index, count } = page;

  useEffect(() => {
    if (!carousel) return;
    const sync = () => setPage({ index: carousel.selectedScrollSnap(), count: carousel.scrollSnapList().length });
    sync();
    carousel.on('select', sync).on('reInit', sync);
    return () => { carousel.off('select', sync).off('reInit', sync); };
  }, [carousel]);

  useEffect(() => { carousel?.scrollTo(0, true); }, [carousel, room]);

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    carousel?.scrollTo(index + direction, reduceMotion);
  };

  return <section className="gallery-demo-room" aria-label={copy.wall}>
    <div className="gallery-demo-controls">
      <div className="gallery-demo-rooms" role="group" aria-label={copy.categories}>
        <button type="button" aria-pressed={room === 'music'} onClick={() => onRoomChange('music')}><Disc3 size={17} aria-hidden="true" />{copy.music}</button>
        <button type="button" aria-pressed={room === 'photo'} onClick={() => onRoomChange('photo')}><Image size={17} aria-hidden="true" />{copy.photo}</button>
      </div>
      <div className="gallery-demo-arrows">
        <button type="button" className="gallery-demo-icon" aria-label={copy.previous} aria-controls="gallery-demo-exhibits" disabled={index === 0} onClick={() => carousel?.scrollPrev(reduceMotion)}><ArrowLeft size={18} aria-hidden="true" /></button>
        <button type="button" className="gallery-demo-icon" aria-label={copy.next} aria-controls="gallery-demo-exhibits" disabled={index + 1 >= count} onClick={() => carousel?.scrollNext(reduceMotion)}><ArrowRight size={18} aria-hidden="true" /></button>
      </div>
    </div>

    <div className="gallery-demo-wall" onKeyDown={handleKeys}>
      <div className="gallery-demo-viewport" ref={viewport}>
        <ul className="gallery-demo-track" id="gallery-demo-exhibits">
          {works.map((work, i) => <li className="gallery-demo-slide" key={work.id}>
            <HangingWork work={work} music={room === 'music'} index={i} reduceMotion={reduceMotion} label={`${copy.open} ${work.title}`} onOpen={onOpen} />
          </li>)}
        </ul>
      </div>
    </div>

    <div className="gallery-demo-foot">
      <p>{copy.swipe}</p>
      <div className="gallery-demo-pages" role="group" aria-label={copy.position}>
        {Array.from({ length: count }, (_, step) => <button key={step} type="button" aria-label={`${copy.position} ${step + 1}`} aria-current={index === step ? 'true' : undefined} onClick={() => carousel?.scrollTo(step, reduceMotion)}><span /></button>)}
      </div>
      <p className="gallery-demo-count" aria-live="polite">{count > 0 && <><span>{formatPosition(index + 1)}</span> / {formatPosition(count)}</>}</p>
    </div>
  </section>;
}

function HangingWork({ work, index, music, reduceMotion, label, onOpen }: {
  work: Exhibit;
  index: number;
  music: boolean;
  reduceMotion: boolean;
  label: string;
  onOpen: (work: Exhibit, button: HTMLButtonElement) => void;
}) {
  const bounds = useRef<DOMRect | null>(null);
  const swing = useSpring(0, settleSwing);
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const lift = useSpring(0, spring);

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = bounds.current;
    if (reduceMotion || event.pointerType !== 'mouse' || !rect || event.buttons) return;
    const x = Math.min(1, Math.max(-1, (event.clientX - rect.left) / rect.width * 2 - 1));
    const y = Math.min(1, Math.max(-1, (event.clientY - rect.top) / rect.height * 2 - 1));
    swing.set(x * 2.8);
    rotateX.set(-y * 6);
    rotateY.set(x * 8);
    lift.set(9);
  };

  const reset = () => {
    bounds.current = null;
    swing.set(0);
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
  };

  return <motion.div className="gallery-demo-exhibit" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.62, delay: reduceMotion ? 0 : Math.min(index, 2) * 0.07, ease: entranceEase }}>
    <span className="gallery-demo-nail" aria-hidden="true" />
    <motion.div className="gallery-demo-pendulum" style={reduceMotion ? undefined : { rotate: swing }}>
      <span className="gallery-demo-cord" aria-hidden="true" />
      <button type="button" className="gallery-demo-work" aria-label={label} onClick={event => onOpen(work, event.currentTarget)} onPointerEnter={event => {
        if (reduceMotion || event.pointerType !== 'mouse') return;
        bounds.current = event.currentTarget.getBoundingClientRect();
        move(event);
      }} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>
        <motion.span className={`gallery-demo-frame${music ? ' is-vinyl' : ''}`} style={reduceMotion ? undefined : { rotateX, rotateY, z: lift }}>
          <span className="gallery-demo-mat">
            <img className="gallery-demo-art" src={work.image} alt="" draggable={false} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" width={510} height={510} />
            {music && <span className="gallery-demo-record">
              <img className="gallery-demo-disc" src={vinyl} alt="" draggable={false} decoding="async" width={512} height={512} />
              <span className="gallery-demo-record-label"><img src={work.image} alt="" draggable={false} decoding="async" width={510} height={510} /></span>
            </span>}
          </span>
        </motion.span>
        <span className="gallery-demo-caption"><span><strong>{work.title}</strong><small>{work.artist}</small></span><ArrowUpRight size={17} aria-hidden="true" /></span>
      </button>
    </motion.div>
  </motion.div>;
}
