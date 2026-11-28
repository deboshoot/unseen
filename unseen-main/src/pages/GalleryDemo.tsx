
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, motionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Link2, Maximize, Menu as MenuIcon, Minimize, Share, X } from 'lucide-react';
import { toast } from 'sonner';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { galleryDemoCopy } from '@/i18n/gallery-demo-copy';
import { musicCopy } from '@/i18n/music-copy';
import { adminGalleryDemoPath } from '@/lib/auth-redirect';
import { demoTracks } from '@/lib/music';
import afterhours from '@/assets/gallery-demo/afterhours.webp';
import novaPortrait from '@/assets/gallery-demo/nova-portrait.webp';
import lyraPortrait from '@/assets/gallery-demo/lyra-portrait.webp';
import glass from '@/assets/gallery-demo/vetro-fume.webp';
import reflection from '@/assets/gallery-demo/riflessi.webp';
import stillWater from '@/assets/gallery-demo/acqua-ferma.webp';
import spiral from '@/assets/gallery-demo/spirale.webp';
import winterSea from '@/assets/gallery-demo/mare-inverno.webp';
import loneTree from '@/assets/gallery-demo/albero.webp';
import GalleryMusicRoom from '@/components/GalleryMusicRoom';
import wall from '@/assets/gallery-demo/parete-grafite.webp';
import glassAudio from '@/assets/gallery-demo/vetro-fume-estratto.wav';
import reflectionAudio from '@/assets/gallery-demo/riflessi-estratto.wav';
import '@/gallery-demo.css';

const ease = [0.22, 1, 0.36, 1] as const;

type Room = 'music' | 'photo';
type Exhibit = { id: string; title: string; artist: string; image: string; audio?: string };
type Copy = (typeof galleryDemoCopy)['it'];
type PhotoId = keyof Copy['photoNotes'];
type PhotoExhibit = Exhibit & { id: PhotoId };
type SoundCopy = (typeof musicCopy)['it'];

const exhibits: { music: Exhibit[]; photo: PhotoExhibit[] } = {
  music: [
    { id: demoTracks[0].id, title: demoTracks[0].title, artist: demoTracks[0].artist, audio: demoTracks[0].audio_url, image: novaPortrait },
    { id: demoTracks[1].id, title: demoTracks[1].title, artist: demoTracks[1].artist, audio: demoTracks[1].audio_url, image: lyraPortrait },
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

const formatIndex = (value: number) => String(value).padStart(2, '0');
const favoriteKeys = { photo: 'unseen-gallery-demo-photo-favorites', music: 'unseen-gallery-demo-music-favorites' };
const exhibitLinkKeys = { photo: 'foto', music: 'vinile' };

function readFavorites(room: Room) {
  try {
    const saved = JSON.parse(localStorage.getItem(favoriteKeys[room]) ?? '[]');
    if (Array.isArray(saved)) return exhibits[room].map(work => work.id).filter(id => saved.includes(id));
  } catch { /* A browser may block local storage. */ }
  return [];
}

export default function GalleryDemo() {
  const { locale, t } = useI18n();
  const { search } = useLocation();
  const copy = galleryDemoCopy[locale];
  const reduced = useReducedMotion() === true;
  const params = new URLSearchParams(search);
  const linkedPhotoIndex = exhibits.photo.findIndex(work => work.id === params.get(exhibitLinkKeys.photo));
  const linkedMusicIndex = exhibits.music.findIndex(work => work.id === params.get(exhibitLinkKeys.music));
  const [room, setRoom] = useState<Room>(linkedPhotoIndex === -1 ? 'music' : 'photo');
  const [favorites, setFavorites] = useState(() => ({ photo: readFavorites('photo'), music: readFavorites('music') }));
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

  useEffect(() => {
    try {
      localStorage.setItem(favoriteKeys.photo, JSON.stringify(favorites.photo));
      localStorage.setItem(favoriteKeys.music, JSON.stringify(favorites.music));
    }
    catch { /* Keep favorites in memory when local storage is unavailable. */ }
  }, [favorites]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === screen.current) await document.exitFullscreen();
      else await screen.current?.requestFullscreen();
    } catch { toast.error(copy.fullscreenError); }
  };

  const copyLink = async (workId?: string) => {
    const feedback = workId ? { position: 'top-center' as const } : undefined;
    try {
      const url = new URL(adminGalleryDemoPath, window.location.origin);
      if (workId) url.searchParams.set(exhibitLinkKeys[room], workId);
      await navigator.clipboard.writeText(url.href);
      toast.success(copy.copied, feedback);
    } catch {
      toast.error(copy.copyError, feedback);
    }
  };

  return <main className="gallery-demo" data-room={room} ref={screen} onPointerMove={event => {
    if (room === 'photo' && !reduced && event.pointerType === 'mouse') cameraX.set((event.clientX / window.innerWidth - 0.5) * -16);
  }} onPointerLeave={() => cameraX.set(0)}>
    <motion.img className="gallery-demo-stage-wall" src={wall} alt="" width={1440} height={810} draggable={false}
      initial={reduced ? false : { scale: 1.18, opacity: 0 }} animate={{ scale: reduced ? 1 : 1.045, opacity: room === 'photo' ? 0.32 : 0.22 }}
      transition={{ duration: reduced ? 0 : 1.1, ease }} style={reduced ? undefined : { x: cameraX }} />
    <div className="gallery-demo-shell">
      <header className="gallery-demo-header">
        <Link to="/admin" className="gallery-demo-logo" aria-label={copy.back} title={copy.back}>
          <img src="/unseen-logo-transparent.png" alt="" width={29} height={29} />
          <span aria-hidden="true">UNSEEN</span>
        </Link>
        {room === 'music' && <nav className="record-navigation" aria-label={copy.menu}>
          <Link to="/">{t('nav.home')}</Link><Link to="/arena">{t('nav.arena')}</Link>
          <Link to="/campionato">{copy.tournaments}</Link><Link to="/gallery">{t('nav.gallery')}</Link>
        </nav>}
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
                {room === 'music' && <Menu.Item onSelect={() => setRoom('photo')}>{copy.photo}</Menu.Item>}
                <Menu.Item onSelect={() => void copyLink()}>{copy.copy}<Link2 size={15} aria-hidden="true" /></Menu.Item>
                {nativeFullscreen && <Menu.Item onSelect={() => void toggleFullscreen()}>{fullscreen ? copy.exitFullscreen : copy.fullscreen}
                  {fullscreen ? <Minimize size={15} aria-hidden="true" /> : <Maximize size={15} aria-hidden="true" />}
                </Menu.Item>}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </header>

      <GalleryRoom key={room} room={room} copy={copy} sound={musicCopy[locale]} reduced={reduced} detailOpen={detail !== null}
        menuContainer={screen.current}
        startIndex={Math.max(0, room === 'photo' ? linkedPhotoIndex : linkedMusicIndex)} favorites={favorites[room]}
        onFavorite={id => setFavorites(current => ({ ...current,
          [room]: current[room].includes(id) ? current[room].filter(favorite => favorite !== id) : [...current[room], id],
        }))}
        onShare={id => void copyLink(id)} onOpen={(work, button) => {
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

type RoomProps = {
  room: Room;
  copy: Copy;
  sound: SoundCopy;
  reduced: boolean;
  detailOpen: boolean;
  menuContainer: HTMLElement | null;
  startIndex: number;
  favorites: string[];
  onFavorite: (id: string) => void;
  onShare: (id: string) => void;
  onOpen: (work: Exhibit, button: HTMLButtonElement) => void;
};

function GalleryRoom(props: RoomProps) {
  return props.room === 'music'
    ? <GalleryMusicRoom {...props} works={exhibits.music} />
    : <PhotoRoom {...props} />;
}

function PhotoRoom({ copy, reduced, startIndex, favorites, onFavorite, onShare, onOpen }: RoomProps) {
  const works = exhibits.photo;
  const [viewport, carousel] = useEmblaCarousel({
    align: 'center', loop: true, containScroll: false, startIndex, watchFocus: false, duration: reduced ? 0 : 38,
  });
  const [index, setIndex] = useState(startIndex);
  const [distances] = useState(() => works.map((_, i) => {
    const gap = i - startIndex;
    return motionValue(gap - Math.round(gap / works.length) * works.length);
  }));
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

  const galleryCarousel = <>
      <div className="gallery-demo-viewport" ref={viewport} tabIndex={0} role="region" aria-label={copy.wall} onKeyDown={navigate}>
        <ul className="gallery-demo-track" id="gallery-demo-works">
          {works.map((work, i) => <li className="gallery-demo-slide" key={work.id}>
            <PhotoPrint work={work} distance={distances[i]} active={i === index} reduced={reduced}
              label={i === index ? copy.open : copy.select} onClick={event => {
                if (i === index) onOpen(work, event.currentTarget);
                else carousel?.scrollTo(i, reduced);
              }} />
          </li>)}
        </ul>
      </div>
      <button type="button" className="gallery-demo-round gallery-demo-prev" aria-label={copy.previous} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollPrev(reduced)}>
        <ArrowLeft size={17} aria-hidden="true" />
      </button>
      <button type="button" className="gallery-demo-round gallery-demo-next" aria-label={copy.next} aria-controls="gallery-demo-works" onClick={() => carousel?.scrollNext(reduced)}>
        <ArrowRight size={17} aria-hidden="true" />
      </button>
  </>;

  const position = <p className="gallery-demo-position" aria-live="polite">
    <span className="sr-only">{copy.position} </span>{formatIndex(index + 1)} <span>/</span> {formatIndex(works.length)}
  </p>;
  const pagination = <ul className="gallery-demo-pagination" aria-label={copy.select}>
    {works.map((work, i) => <li key={work.id}>
      <button type="button" aria-label={work.title} aria-pressed={i === index} onClick={() => carousel?.scrollTo(i, reduced)} />
    </li>)}
  </ul>;

  const dock = {
    work: selected,
    room: 'photo' as const,
    copy,
    favorite: favorites.includes(selected.id),
    onFavorite: () => onFavorite(selected.id),
    onOpen: (event: MouseEvent<HTMLButtonElement>) => onOpen(selected, event.currentTarget),
  };

  const [heading, qualifier] = copy.photoHeading;
  return <section className="gallery-demo-exhibition gallery-demo-photo" aria-label={copy.photo}>
    <div className="gallery-demo-photo-ambient" aria-hidden="true">
      <span className="gallery-demo-photo-arc gallery-demo-photo-arc-left" />
      <span className="gallery-demo-photo-arc gallery-demo-photo-arc-right" />
    </div>
    <div className="gallery-demo-photo-heading">
      <p className="gallery-demo-kicker">{copy.collection}</p>
      <h1>{heading} <span>{qualifier}</span><span className="gallery-demo-photo-period" aria-hidden="true">.</span></h1>
      <p>{copy.photoIntro}</p>
    </div>
    <div className="gallery-demo-photo-wall">{galleryCarousel}</div>
    {position}
    <WorkDock {...dock} secondaryAction={<button type="button" className="gallery-demo-dock-icon" aria-label={copy.sharePhoto}
      title={copy.sharePhoto} onClick={() => onShare(selected.id)}><Share size={20} aria-hidden="true" /></button>}>
      <p className="gallery-demo-photo-note">{copy.photoNotes[selected.id]}</p>
    </WorkDock>
    {pagination}
  </section>;
}

function WorkDock({ work, room, copy, favorite, onFavorite, onOpen, secondaryAction, children }: {
  work: Exhibit;
  room: Room;
  copy: Copy;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
  secondaryAction: ReactNode;
  children: ReactNode;
}) {
  return <div className={`gallery-demo-dock gallery-demo-${room}-dock`}>
    <div className="gallery-demo-dock-work">
      <img src={work.image} alt="" width={84} height={68} decoding="async" draggable={false} />
      <div className="gallery-demo-selection">
        <h2>{work.title}</h2>
        <p className="gallery-demo-artist">{work.artist}</p>
      </div>
    </div>
    <div className="gallery-demo-dock-content">{children}</div>
    <div className="gallery-demo-actions">
      <button type="button" className="gallery-demo-dock-icon gallery-demo-favorite" aria-label={copy.favorite} title={copy.favorite}
        aria-pressed={favorite} onClick={onFavorite}><Heart size={24} strokeWidth={1.45} aria-hidden="true" /></button>
      {secondaryAction}
      <button type="button" className="gallery-demo-open" onClick={onOpen}>
        {copy.open}<ArrowUpRight size={19} aria-hidden="true" />
      </button>
    </div>
  </div>;
}

function PhotoPrint({ work, distance, active, reduced, label, onClick }: {
  work: Exhibit; distance: MotionValue<number>; active: boolean; reduced: boolean;
  label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const scale = useTransform(distance, [-1.5, -1, 0, 1, 1.5], [0.56, 0.67, 1, 0.67, 0.56]);
  const opacity = useTransform(distance, [-1.5, -1, 0, 1, 1.5], [0.18, 0.55, 1, 0.55, 0.18]);
  const y = useTransform(distance, [-1, 0, 1], [-15, 0, -15]);
  const filter = useTransform(distance, [-1, 0, 1], ['blur(2.5px)', 'blur(0px)', 'blur(2.5px)']);

  return <motion.div className="gallery-demo-print" data-active={active}
    style={reduced ? { opacity: active ? 1 : 0.55, scale: active ? 1 : 0.67, y: active ? 0 : -15 } : { scale, opacity, y, filter }}>
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
