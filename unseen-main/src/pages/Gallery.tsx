import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { supabase } from "@/supabaseClient";
import { getInstagramProfile } from "@/lib/instagram";

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

const categories = [
  { key: "winner_id", label: "Vincitore del mese", accent: "text-amber-200" },
  { key: "people_choice_id", label: "Vincitore del popolo", accent: "text-cyan-200" },
  { key: "jury_choice_id", label: "Scelto dalla giuria", accent: "text-rose-200" },
] as const;

const Gallery = () => {
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
    <div className="luxury-gallery min-h-screen px-5 pb-24 pt-28 md:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="gallery-heading mb-16 max-w-3xl">
          <p className="gallery-kicker mb-4">UNSEEN / COLLECTIONS</p>
          <h1 className="gallery-title">GALLERIA</h1>
        </motion.header>

        {isLoading ? <p className="py-24 text-center font-body text-sm uppercase tracking-[0.3em] text-muted-foreground">Caricamento archivio...</p> : null}
        {!isLoading && months.length === 0 ? (
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="gallery-empty-display" aria-label="Spazio espositivo in attesa della prima collezione">
            <div className="gallery-empty-header">
              <span className="gallery-empty-index">01 / 01</span>
              <span className="gallery-empty-status"><i /> In allestimento</span>
            </div>
            <div className="gallery-empty-frames" aria-hidden="true">
              <span className="gallery-empty-frame gallery-empty-frame-back" />
              <span className="gallery-empty-frame gallery-empty-frame-main" />
              <span className="gallery-empty-frame gallery-empty-frame-front" />
            </div>
            <div className="gallery-empty-copy">
              <p className="gallery-empty-kicker">Prima collezione</p>
              <h2>Il primo campionato<br /><em>sta per iniziare.</em></h2>
              <p>Questo spazio accoglierà le opere vincitrici, esposte una accanto all’altra.</p>
            </div>
          </motion.section>
        ) : null}

        {months.length > 0 ? <div className="gallery-season-section">
          <div className="gallery-season-heading">
            <p className="gallery-section-label">Archivio dei vincitori</p>
            <p className="gallery-season-hint">Seleziona una stagione per scoprire gli altri riconoscimenti</p>
          </div>
          <div className="gallery-winners-row">
            {months.map((month, monthIndex) => {
              const winner = artworks[month.winner_id];
              if (!winner) return null;
              const isExpanded = expandedMonth === month.id;
              return (
                <motion.section key={month.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.55, delay: monthIndex * 0.04 }} className="gallery-season-item">
                  <GalleryCard work={winner} category="Vincitore del mese" accent="text-white" onOpen={() => setSelectedWork(winner)} />
                  <button type="button" className={`gallery-season-toggle ${isExpanded ? "is-open" : ""}`} aria-expanded={isExpanded} onClick={() => setExpandedMonth(isExpanded ? null : month.id)}>
                    <span><strong>{month.month_label}</strong><small>{isExpanded ? "Nascondi riconoscimenti" : "Mostra gli altri vincitori"}</small></span>
                    <ChevronDown size={17} aria-hidden="true" />
                  </button>
                  {isExpanded ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="gallery-related-winners">
                      {categories.slice(1).map((category) => {
                        const work = artworks[month[category.key]];
                        if (!work) return null;
                        return <GalleryCard key={category.key} work={work} category={category.label} accent="text-white" onOpen={() => setSelectedWork(work)} />;
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
        {selectedWork ? <><p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Archivio Unseen</p><h2 id="gallery-detail-title" className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">{selectedWork.titolo}</h2><div className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground"><span>{selectedWork.autore}</span>{getInstagramProfile(selectedWork.social_link) ? <a href={getInstagramProfile(selectedWork.social_link)?.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{getInstagramProfile(selectedWork.social_link)?.username}</a> : null}</div><p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">{selectedWork.storia || "Nessuna descrizione disponibile."}</p></> : null}
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
