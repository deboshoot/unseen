import { useEffect, useState } from "react";
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
    <div className="gallery-bg min-h-screen px-5 pb-24 pt-28 md:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 max-w-3xl">
          <p className="mb-4 font-body text-xs uppercase tracking-[0.35em] text-primary">Archivio Unseen</p>
          <h1 className="font-display text-5xl font-black tracking-tight text-foreground md:text-7xl">I campionati</h1>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-muted-foreground md:text-lg">Tre sguardi, un mese, una storia. Le opere che hanno definito ogni campionato sono esposte insieme.</p>
        </motion.header>

        {isLoading ? <p className="py-24 text-center font-body text-sm uppercase tracking-[0.3em] text-muted-foreground">Caricamento archivio...</p> : null}
        {!isLoading && months.length === 0 ? <p className="py-24 text-center font-display text-xl text-muted-foreground">Il primo campionato deve ancora essere proclamato.</p> : null}

        <div className="space-y-24">
          {months.map((month, monthIndex) => (
            <motion.section key={month.id} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7 }}>
              <div className="mb-7 flex items-end justify-between gap-5 border-b border-foreground/10 pb-4">
                <div><p className="font-body text-xs uppercase tracking-[0.3em] text-primary">{String(monthIndex + 1).padStart(2, "0")}</p><h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{month.month_label}</h2></div>
                <p className="hidden font-body text-xs uppercase tracking-[0.2em] text-muted-foreground md:block">Tre opere selezionate</p>
              </div>
              <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-5 scrollbar-hide">
                {categories.map((category, categoryIndex) => {
                  const work = artworks[month[category.key]];
                  if (!work) return null;
                  return <GalleryCard key={category.key} work={work} category={category.label} accent={category.accent} featured={categoryIndex === 0} onOpen={() => setSelectedWork(work)} />;
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>

      <ArtworkDetailModal open={!!selectedWork} onClose={() => setSelectedWork(null)} imageSrc={selectedWork?.immagine_url ?? ""} imageAlt={selectedWork?.titolo ?? ""} titleId="gallery-detail-title">
        {selectedWork ? <><p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Archivio Unseen</p><h2 id="gallery-detail-title" className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">{selectedWork.titolo}</h2><div className="flex flex-wrap items-center gap-2 font-body text-sm text-foreground"><span>{selectedWork.autore}</span>{getInstagramProfile(selectedWork.social_link) ? <a href={getInstagramProfile(selectedWork.social_link)?.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@{getInstagramProfile(selectedWork.social_link)?.username}</a> : null}</div><p className="font-body text-base leading-relaxed text-muted-foreground md:text-lg">{selectedWork.storia || "Nessuna descrizione disponibile."}</p></> : null}
      </ArtworkDetailModal>
    </div>
  );
};

const GalleryCard = ({ work, category, accent, featured, onOpen }: { work: GalleryWork; category: string; accent: string; featured: boolean; onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className={`group w-[min(82vw,440px)] flex-shrink-0 snap-start text-left ${featured ? "md:w-[min(48vw,560px)]" : "md:w-[min(34vw,390px)]"}`}>
    <div className={`relative overflow-hidden border border-foreground/10 bg-foreground/[0.04] p-2 transition duration-500 group-hover:-translate-y-1 group-hover:border-primary/40 ${featured ? "aspect-[4/3]" : "aspect-[4/5]"}`}>
      <img src={work.immagine_url} alt={work.titolo} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
      <div className="pointer-events-none absolute inset-2 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>
    <div className="border-b border-foreground/10 px-1 py-5">
      <p className={`font-body text-[10px] uppercase tracking-[0.25em] ${accent}`}>{category}</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">{work.titolo}</h3>
      <p className="mt-1 font-body text-sm text-muted-foreground">{work.autore}</p>
    </div>
  </button>
);

export default Gallery;
