import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, Instagram, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArtworkDetailModal } from '@/components/ArtworkDetailModal';
import { supabase } from '@/supabaseClient';
import { getInstagramProfile } from '@/lib/instagram';
import { useI18n } from '@/i18n/I18nProvider';
import { galleryCopy } from '@/i18n/gallery-copy';
import type { ChampionshipKind } from '@/lib/championship';
import { galleryChampionSelect, galleryMonthLabel, type GalleryChampion } from '@/lib/championship-gallery';
import MusicRecord from '@/components/MusicRecord';
import '@/gallery-champions.css';

type GalleryWork = { id: string; titolo: string; autore: string; immagine_url: string; storia: string; social_link: string };
type GalleryMonth = { id: string; month_key: string; month_label: string; winner_id: string; people_choice_id: string; jury_choice_id: string };
const championWork = ({ entry }: GalleryChampion): GalleryWork => ({ id: entry.id, titolo: entry.title, autore: entry.artist, immagine_url: entry.image_url, storia: '', social_link: entry.instagram_username ?? '' });
const championshipPath = (kind: ChampionshipKind, id?: string) => `/campionato?tipo=${kind === 'music' ? 'musica' : 'foto'}${id ? `&id=${id}` : ''}`;

export default function Gallery() {
  const { locale } = useI18n();
  const text = galleryCopy[locale];
  const reduceMotion = useReducedMotion();
  const [kind, setKind] = useState<ChampionshipKind>('photo');
  const [page, setPage] = useState(0);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [months, setMonths] = useState<GalleryMonth[]>([]);
  const [artworks, setArtworks] = useState<Record<string, GalleryWork>>({});
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState(false);
  const [archiveRevision, setArchiveRevision] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const champions = useQuery({
    queryKey: ['gallery-champions', kind, page],
    queryFn: async ({ signal }) => {
      const { data, error, count } = await supabase.from('championship_gallery').select(galleryChampionSelect, { count: 'exact' }).eq('kind', kind).order('month_key', { ascending: false }).order('published_at', { ascending: false }).range(page * 24, page * 24 + 23).abortSignal(signal);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as GalleryChampion[], count: count ?? 0 };
    },
    staleTime: 30000, refetchInterval: 60000,
  });

  useEffect(() => {
    let alive = true;
    setArchiveLoading(true); setArchiveError(false);
    void (async () => {
      const { data, error } = await supabase.from('gallery_months').select('id, month_key, month_label, winner_id, people_choice_id, jury_choice_id').order('month_key', { ascending: false });
      if (error) throw error;
      const galleryMonths = (data ?? []) as GalleryMonth[];
      const ids = [...new Set(galleryMonths.flatMap(month => [month.winner_id, month.people_choice_id, month.jury_choice_id]).filter(Boolean))];
      const works = ids.length ? await supabase.from('opere').select('id, titolo, immagine_url, autore, storia, social_link').in('id', ids) : { data: [], error: null };
      if (works.error) throw works.error;
      if (alive) {
        setMonths(galleryMonths);
        setArtworks(Object.fromEntries(((works.data ?? []) as GalleryWork[]).map(work => [work.id, work])));
      }
    })().catch(() => { if (alive) setArchiveError(true); }).finally(() => { if (alive) setArchiveLoading(false); });
    return () => { alive = false; };
  }, [archiveRevision]);

  const rows = champions.data?.rows ?? [];
  const legacy = kind === 'photo' ? months.filter(month => artworks[month.winner_id]) : [];
  const featuredChampion = rows[0];
  const featuredMonth = !featuredChampion ? legacy[0] : undefined;
  const featuredWork = featuredChampion ? championWork(featuredChampion) : featuredMonth ? artworks[featuredMonth.winner_id] : null;
  const featuredLabel = featuredChampion ? text.monthlyChampion : text.photoWinner;
  const featuredPeriod = featuredChampion?.month_key ?? featuredMonth?.month_key;
  const collectionCount = (champions.data?.count ?? 0) + legacy.length;
  const loading = champions.isLoading || (kind === 'photo' && archiveLoading);
  const hasError = Boolean(champions.error) || (kind === 'photo' && archiveError);
  const remainingMonths = legacy.filter(month => month.id !== featuredMonth?.id);
  const profile = featuredWork ? getInstagramProfile(featuredWork.social_link) : null;
  const submitPath = kind === 'music' ? '/submit?tipo=musica' : '/submit';

  const awards = (month: GalleryMonth) => {
    const selections = [{ id: month.people_choice_id, label: text.second }, { id: month.jury_choice_id, label: text.third }].filter(item => artworks[item.id]);
    if (!selections.length) return null;
    const expanded = expandedMonth === month.id;
    return <div className="collection-awards">
      <button type="button" className="collection-awards-toggle" aria-expanded={expanded} aria-controls={`awards-${month.id}`} onClick={() => setExpandedMonth(expanded ? null : month.id)}><span>{expanded ? text.hideAwards : text.otherAwards}<small>{String(selections.length).padStart(2, '0')}</small></span><ChevronDown size={17} /></button>
      {expanded && <div id={`awards-${month.id}`} className="collection-awards-grid">{selections.map(item => <GalleryCard key={item.label} work={artworks[item.id]} category={item.label} onOpen={() => setSelectedWork(artworks[item.id])} />)}</div>}
    </div>;
  };

  return <main className="unseen-collection">
    <div className="collection-shell">
      <motion.header className="collection-hero" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
        <div><p className="collection-eyebrow">{text.collection}</p><h1>{text.title}<span>.</span></h1></div>
        <div className="collection-intro"><p className="collection-statement">{text.statement}</p><p>{text.intro}</p></div>
      </motion.header>

      <div className="collection-navigation">
        <nav aria-label={text.categories}>{(['photo', 'music'] as const).map((value, index) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(0); setActiveAudio(null); setExpandedMonth(null); }}><span aria-hidden="true">0{index + 1}</span>{value === 'photo' ? text.photo : text.music}</button>)}</nav>
        <p className="collection-archive-label"><span />{text.permanent}{!loading && !hasError && collectionCount > 0 && <small>{String(collectionCount).padStart(2, '0')} {collectionCount === 1 ? text.edition : text.editions}</small>}</p>
      </div>

      {loading && <div className="collection-loading" role="status"><span />{text.loading}</div>}
      {champions.error && <div className="collection-notice" role="alert">{text.loadError}<button onClick={() => void champions.refetch()}>{text.retry}<ArrowRight size={14} /></button></div>}
      {kind === 'photo' && archiveError && <div className="collection-notice" role="alert">{text.archiveError}<button onClick={() => setArchiveRevision(value => value + 1)}>{text.retry}<ArrowRight size={14} /></button></div>}

      {!loading && featuredWork && <section className="collection-feature" aria-label={text.featured}>
        <div className="collection-section-line"><p><span>01 /</span> {text.collectionLabel}</p><span>{featuredPeriod && galleryMonthLabel(featuredPeriod, locale)}</span></div>
        <div className={`collection-exhibition ${kind === 'music' ? 'is-music' : ''}`}>
          <div className="collection-exhibition-media">
            {kind === 'music' && featuredChampion ? <MusicRecord track={{ ...featuredChampion.entry, cover_url: featuredChampion.entry.image_url, audio_url: featuredChampion.entry.audio_url ?? '' }} activeId={activeAudio} onActiveChange={setActiveAudio} /> : <button type="button" className="collection-artwork" onClick={() => setSelectedWork(featuredWork)} aria-label={`${text.enlarge}: ${featuredWork.titolo}`}>
              <span className="collection-mount"><img src={featuredWork.immagine_url} alt={featuredWork.titolo} decoding="async" /></span>
              <span className="collection-artwork-caption"><span>UNSEEN COLLECTION</span><span>{text.enlarge}<Plus size={14} /></span></span>
            </button>}
          </div>
          <div className="collection-exhibition-copy">
            <p className="collection-eyebrow">{featuredLabel}</p>
            <h2>{featuredWork.titolo}</h2>
            <p className="collection-artist"><span>{kind === 'music' ? text.artist : text.author}</span>{featuredWork.autore}</p>
            <p className="collection-story">{featuredWork.storia || (kind === 'music' ? text.musicNote : text.photoNote)}</p>
            <dl className="collection-metadata"><div><dt>{text.period}</dt><dd>{featuredPeriod && galleryMonthLabel(featuredPeriod, locale)}</dd></div><div><dt>{text.recognition}</dt><dd>{featuredLabel}</dd></div></dl>
            {kind === 'photo' && <button type="button" className="collection-text-link" onClick={() => setSelectedWork(featuredWork)}>{text.viewWork}<ArrowUpRight size={17} /></button>}
            {profile && <a className="collection-profile" href={profile.href} target="_blank" rel="noopener noreferrer"><Instagram size={13} />@{profile.username}<ArrowUpRight size={12} /></a>}
            {featuredChampion && <Link className="collection-tournament" to={championshipPath(kind, featuredChampion.championship_id)}>{featuredChampion.championship.name}<ArrowUpRight size={14} /></Link>}
          </div>
        </div>
        {featuredMonth && awards(featuredMonth)}
      </section>}

      {!loading && !hasError && !featuredWork && <section className={`collection-empty ${kind === 'music' ? 'is-music' : ''}`} aria-label={text.emptyLabel}>
        <div className="collection-empty-art" aria-hidden="true"><div className="collection-empty-object"><span>UNSEEN</span><small>{kind === 'music' ? 'SOUND COLLECTION' : 'PHOTO COLLECTION'}</small></div><span className="collection-empty-mark">U.</span></div>
        <div className="collection-empty-copy"><p className="collection-eyebrow">{text.emptyLabel}</p><h2>{text.emptyTitle}</h2><p>{kind === 'music' ? text.emptyMusic : text.emptyPhoto}</p><Link className="collection-text-link" to={championshipPath(kind)}>{text.discover}<ArrowUpRight size={17} /></Link></div>
      </section>}

      {!loading && (rows.length > 1 || remainingMonths.length > 0) && <section className="collection-archive" aria-label={text.previous}>
        <div className="collection-section-line"><p><span>02 /</span> {text.previous}</p><span>{text.archiveNote}</span></div>
        <div className={`collection-grid ${kind === 'music' ? 'is-music' : ''}`}>
          {rows.slice(1).map(item => <article className="collection-entry" key={item.championship_id}><p className="collection-entry-period">{galleryMonthLabel(item.month_key, locale)}</p>{kind === 'music' ? <MusicRecord track={{ ...item.entry, cover_url: item.entry.image_url, audio_url: item.entry.audio_url ?? '' }} activeId={activeAudio} onActiveChange={setActiveAudio} /> : <GalleryCard work={championWork(item)} category={text.monthlyChampion} onOpen={() => setSelectedWork(championWork(item))} />}<Link className="collection-tournament" to={championshipPath(kind, item.championship_id)}>{item.championship.name}<ArrowUpRight size={14} /></Link></article>)}
          {remainingMonths.map(month => <article className="collection-entry" key={month.id}><p className="collection-entry-period">{galleryMonthLabel(month.month_key, locale)}</p><GalleryCard work={artworks[month.winner_id]} category={text.photoWinner} onOpen={() => setSelectedWork(artworks[month.winner_id])} />{awards(month)}</article>)}
        </div>
      </section>}

      {(champions.data?.count ?? 0) > 24 && <nav className="collection-pagination" aria-label={text.previous}><button disabled={!page} onClick={() => { setPage(value => value - 1); setActiveAudio(null); }}>{text.previousPage}</button><span>{text.page} {page + 1}</span><button disabled={(page + 1) * 24 >= (champions.data?.count ?? 0)} onClick={() => { setPage(value => value + 1); setActiveAudio(null); }}>{text.nextPage}</button></nav>}

      <footer className="collection-invitation"><div><p className="collection-eyebrow">{text.footerLabel}</p><h2>{text.footerTitle}<br /><em>{text.footerEmphasis}</em></h2></div><div><p>{text.footerNote}</p><Link className="collection-submit-link" to={submitPath}>{kind === 'music' ? text.submitMusic : text.submitPhoto}<ArrowDownRight size={20} /></Link></div><span className="collection-signature" aria-hidden="true">UNSEEN</span></footer>
    </div>

    <ArtworkDetailModal open={!!selectedWork} onClose={() => setSelectedWork(null)} imageSrc={selectedWork?.immagine_url ?? ''} imageAlt={selectedWork?.titolo ?? ''} titleId="gallery-detail-title">
      {selectedWork && <><p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{text.collection}</p><h2 id="gallery-detail-title" className="mt-2 font-display text-2xl font-medium text-foreground md:text-3xl">{selectedWork.titolo}</h2><div className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground"><span>{selectedWork.autore}</span>{getInstagramProfile(selectedWork.social_link) && <a href={getInstagramProfile(selectedWork.social_link)!.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{getInstagramProfile(selectedWork.social_link)!.username}</a>}</div><p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">{selectedWork.storia || text.noDescription}</p></>}
    </ArtworkDetailModal>
  </main>;
}

function GalleryCard({ work, category, onOpen }: { work: GalleryWork; category: string; onOpen: () => void }) {
  return <button type="button" className="collection-piece" onClick={onOpen}>
    <span className="collection-piece-mount"><img src={work.immagine_url} alt={work.titolo} loading="lazy" decoding="async" /><span className="collection-piece-open" aria-hidden="true"><Plus size={20} /></span></span>
    <span className="collection-piece-caption"><span className="collection-eyebrow">{category}</span><span className="collection-piece-title">{work.titolo}</span><span className="collection-piece-author">{work.autore}</span><ArrowUpRight size={17} aria-hidden="true" /></span>
  </button>;
}
