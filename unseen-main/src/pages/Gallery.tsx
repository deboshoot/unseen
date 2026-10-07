import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Camera, ChevronDown, Images, Music2, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { supabase } from "@/supabaseClient";
import { getInstagramProfile } from "@/lib/instagram";
import { useI18n } from "@/i18n/I18nProvider";
import type { ChampionshipKind } from '@/lib/championship';
import { galleryChampionSelect, galleryMonthLabel, type GalleryChampion } from '@/lib/championship-gallery';
import MusicRecord from '@/components/MusicRecord';
import '@/gallery-champions.css';

type GalleryWork = {
  id: string;
  titolo: string;
  autore: string;
  immagine_url: string;
  storia: string;
  social_link: string;
};

type GalleryMonth = {
  id: string;
  month_key: string;
  month_label: string;
  winner_id: string;
  people_choice_id: string;
  jury_choice_id: string;
};

const Gallery = () => {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<ChampionshipKind>('photo');
  const [page, setPage] = useState(0);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const champions = useQuery({ queryKey: ['gallery-champions', kind, page], queryFn: async ({ signal }) => {
    const { data, error, count } = await supabase.from('championship_gallery').select(galleryChampionSelect, { count: 'exact' }).eq('kind', kind).order('month_key', { ascending: false }).order('published_at', { ascending: false }).range(page * 24, page * 24 + 23).abortSignal(signal);
    if (error) throw error; return { rows: (data ?? []) as unknown as GalleryChampion[], count: count ?? 0 };
  }, staleTime: 30000, refetchInterval: 60000 });
  const categories = [
    { key: "winner_id", label: t("gallery.winner"), accent: "text-amber-200" },
    { key: "people_choice_id", label: t("gallery.peopleChoice"), accent: "text-cyan-200" },
    { key: "jury_choice_id", label: t("gallery.juryChoice"), accent: "text-rose-200" },
  ] as const;
  const [months, setMonths] = useState<GalleryMonth[]>([]);
  const [artworks, setArtworks] = useState<Record<string, GalleryWork>>({});
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    const loadGallery = async () => {
      const { data: monthData, error: monthError } = await supabase
        .from("gallery_months")
        .select("id, month_key, month_label, winner_id, people_choice_id, jury_choice_id")
        .order("month_key", { ascending: false });

      if (monthError || !monthData) {
        console.error("Gallery: errore caricamento campionati", monthError);
        setIsLoading(false);
        return;
      }

      const galleryMonths = monthData as GalleryMonth[];
      const ids = [...new Set(galleryMonths.flatMap((month) => [month.winner_id, month.people_choice_id, month.jury_choice_id]))];
      if (!ids.length) { setMonths(galleryMonths); setIsLoading(false); return; }
      const { data: artworkData, error: artworkError } = await supabase
        .from("opere")
        .select("id, titolo, immagine_url, autore, storia, social_link")
        .in("id", ids);

      if (artworkError) console.error("Gallery: errore caricamento opere", artworkError);
      const artworkMap = Object.fromEntries(((artworkData ?? []) as GalleryWork[]).map((work) => [work.id, work]));
      setMonths(galleryMonths);
      setArtworks(artworkMap);
      setIsLoading(false);
    };

    void loadGallery();
  }, []);

  return (
    <div className="gallery-page luxury-gallery min-h-screen px-5 pb-24 pt-28 md:px-10 md:pt-36">
      <div className="mx-auto max-w-7xl">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gallery-heading gallery-hero mb-14 max-w-4xl md:mb-20">
          <div className="gallery-hero-topline">
            <p className="gallery-kicker">{t("gallery.kicker")}</p>
            <span><Images size={14} /> Archivio digitale</span>
          </div>
          <h1 className="gallery-title mt-5">{t("gallery.title")}</h1>
          <p className="gallery-hero-intro">Le opere che hanno vinto il campionato e trovato il loro posto nella memoria di Unseen.</p>
          <div className="champ-kind-tabs" aria-label="Tipo di vincitori">{(['photo', 'music'] as const).map(value => <button key={value} className={kind === value ? 'is-selected' : ''} aria-pressed={kind === value} onClick={() => { setKind(value); setPage(0); setActiveAudio(null); }}>{value === 'photo' ? <Camera size={15} /> : <Music2 size={15} />}{value === 'photo' ? 'Fotografia' : 'Musica'}</button>)}</div>
        </motion.header>

        {isLoading ? <p className="py-24 text-center font-body text-sm uppercase tracking-[0.3em] text-muted-foreground">{t("gallery.loading")}</p> : null}
        {champions.isLoading && <p className="py-8 text-muted-foreground" role="status">Caricamento vincitori…</p>}
        {champions.error && <p className="py-8 text-muted-foreground" role="alert">Non riesco a caricare i vincitori. <button onClick={() => void champions.refetch()} className="underline">Riprova</button></p>}
        {!!champions.data?.rows.length && <section className="gallery-champions" aria-label="Vincitori dei campionati"><div className="gallery-season-heading"><div><p className="gallery-section-label">CAMPIONI DEL MESE</p><p className="gallery-season-count">{champions.data.count} VINCITORI</p></div><p className="gallery-season-hint">Ogni vincitore celebra il mese di inizio del suo campionato.</p></div><div className={`gallery-champion-grid ${kind === 'music' ? 'is-music' : ''}`}>{champions.data.rows.map(item => {
          const entry = item.entry;
          const work = { id: entry.id, titolo: entry.title, autore: entry.artist, immagine_url: entry.image_url, storia: '', social_link: entry.instagram_username ?? '' };
          return <article key={item.championship_id} className="gallery-champion-card"><p className="gallery-champion-month"><Trophy size={14} />{galleryMonthLabel(item.month_key, locale)}</p>{kind === 'music' ? <MusicRecord track={{ ...entry, cover_url: entry.image_url, audio_url: entry.audio_url ?? '' }} activeId={activeAudio} onActiveChange={setActiveAudio} /> : <GalleryCard work={work} category="VINCITORE DEL CAMPIONATO" accent="text-amber-200" onOpen={() => setSelectedWork(work)} />}<Link to={`/campionato?tipo=${kind === 'music' ? 'musica' : 'foto'}&id=${item.championship_id}`} className="gallery-champion-link">{item.championship.name}<ArrowUpRight size={13} /></Link></article>;
        })}</div><div className="gallery-champion-pagination"><button disabled={!page} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>Pagina {page + 1}</span><button disabled={(page + 1) * 24 >= champions.data.count} onClick={() => setPage(p => p + 1)}>Successivi</button></div></section>}
        {!isLoading && !champions.isLoading && !champions.error && !champions.data?.count && (kind === 'music' || months.length === 0) ? (
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="gallery-empty-display" aria-label="Spazio espositivo in attesa della prima collezione">
            <div className="gallery-empty-header">
              <span className="gallery-empty-index">ARCHIVIO · 01</span>
              <span className="gallery-empty-status"><i /> {t("gallery.emptyLabel")}</span>
            </div>
            <div className="gallery-empty-layout">
              <div className="gallery-empty-copy">
                <div className="gallery-empty-icon"><Sparkles size={18} /></div>
                <p className="gallery-empty-kicker">{t("gallery.firstCollection")}</p>
                <h2>{kind === 'music' ? 'Il prossimo suono da ricordare.' : t("gallery.emptyTitle")}</h2>
                <p>{kind === 'music' ? 'Il vincitore del primo campionato musicale troverà qui il suo posto. La prossima copertina potrebbe essere la tua.' : t("gallery.emptyText")}</p>
                <Link to={kind === 'music' ? '/submit?tipo=musica' : '/submit'} className="gallery-empty-cta">{kind === 'music' ? 'Invia il tuo brano' : 'Invia la tua opera'} <ArrowUpRight size={16} /></Link>
              </div>
              <div className="gallery-empty-frames" aria-hidden="true">
                <span className="gallery-empty-frame gallery-empty-frame-back" />
                <span className="gallery-empty-frame gallery-empty-frame-main" />
                <span className="gallery-empty-frame gallery-empty-frame-front" />
              </div>
            </div>
          </motion.section>
        ) : null}

        {kind === 'photo' && months.length > 0 ? <div className="gallery-season-section">
          <div className="gallery-season-heading">
            <div>
              <p className="gallery-section-label">{t("gallery.archive")}</p>
              <p className="gallery-season-count">{months.length.toString().padStart(2, "0")} {months.length === 1 ? "COLLEZIONE" : "COLLEZIONI"}</p>
            </div>
            <p className="gallery-season-hint">{t("gallery.seasonHint")}</p>
          </div>
          <div className="gallery-winners-row">
            {months.map((month, monthIndex) => {
              const winner = artworks[month.winner_id];
              if (!winner) return null;
              const isExpanded = expandedMonth === month.id;
              return (
                <motion.section key={month.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay: monthIndex * 0.04 }} className="gallery-season-item">
                  <GalleryCard work={winner} category={t("gallery.firstPosition")} accent="text-white" onOpen={() => setSelectedWork(winner)} />
                  <button type="button" className={`gallery-season-toggle ${isExpanded ? "is-open" : ""}`} aria-expanded={isExpanded} onClick={() => setExpandedMonth(isExpanded ? null : month.id)}>
                    <span><strong>{month.month_label}</strong><small>{isExpanded ? t("gallery.hideAwards") : t("gallery.showAwards")}</small></span>
                    <ChevronDown size={17} aria-hidden="true" />
                  </button>
                  {isExpanded ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="gallery-related-winners">
                      {categories.slice(1).map((category) => {
                        const work = artworks[month[category.key]];
                        if (!work) return null;
                        const positionLabel = category.key === "people_choice_id" ? t("gallery.secondPosition") : t("gallery.thirdPosition");
                        return <GalleryCard key={category.key} work={work} category={positionLabel} accent="text-white" onOpen={() => setSelectedWork(work)} />;
                      })}
                    </motion.div>
                  ) : null}
                </motion.section>
              );
            })}
          </div>
        </div> : null}
      </div>

      <ArtworkDetailModal open={!!selectedWork} onClose={() => setSelectedWork(null)} imageSrc={selectedWork?.immagine_url ?? ""} imageAlt={selectedWork?.titolo ?? ""} titleId="gallery-detail-title">
        {selectedWork ? <><p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{t("gallery.archiveLabel")}</p><h2 id="gallery-detail-title" className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">{selectedWork.titolo}</h2><div className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground"><span>{selectedWork.autore}</span>{getInstagramProfile(selectedWork.social_link) ? <a href={getInstagramProfile(selectedWork.social_link)?.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{getInstagramProfile(selectedWork.social_link)?.username}</a> : null}</div><p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">{selectedWork.storia || t("gallery.noDescription")}</p></> : null}
      </ArtworkDetailModal>
    </div>
  );
};

const GalleryCard = ({ work, category, accent, onOpen }: { work: GalleryWork; category: string; accent: string; onOpen: () => void }) => {
  const [imageRatio, setImageRatio] = useState("4 / 5");

  return (
    <button type="button" onClick={onOpen} className="gallery-piece group w-[min(57vw,260px)] flex-shrink-0 snap-start text-left md:w-[min(18vw,230px)]">
      <span className="gallery-wire" aria-hidden="true" />
      <div className="gallery-frame">
        <div className="gallery-frame-inner" style={{ aspectRatio: imageRatio }}>
          <img
            src={work.immagine_url}
            alt={work.titolo}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            onLoad={(event) => {
              const image = event.currentTarget;
              setImageRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
            }}
          />
          <div className="gallery-frame-sheen" />
        </div>
      </div>
      <div className="gallery-plaque">
        <p className={`gallery-plaque-category ${accent}`}>{category}</p>
        <h3 className="gallery-plaque-title">{work.titolo}</h3>
        <p className="gallery-plaque-author">{work.autore}</p>
      </div>
    </button>
  );
};

export default Gallery;
