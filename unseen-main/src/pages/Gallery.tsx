import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
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

const HangingFrame = ({
  work,
  index,
  scrollVelocity,
  onOpen,
}: {
  work: GalleryWork;
  index: number;
  scrollVelocity: number;
  onOpen: () => void;
}) => {
  const swingAngle = useMotionValue(0);
  const springSwing = useSpring(swingAngle, { stiffness: 60, damping: 8, mass: 0.8 });

  useEffect(() => {
    const delay = index * 50;
    const timeout = setTimeout(() => {
      swingAngle.set(scrollVelocity * (0.8 + index * 0.15));
    }, delay);
    return () => clearTimeout(timeout);
  }, [scrollVelocity, index, swingAngle]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center"
    >
      <div className="w-[1px] h-12 md:h-20 bg-gradient-to-b from-foreground/30 to-foreground/10" />

      <motion.div
        style={{ rotate: springSwing, transformOrigin: "top center" }}
        className="cursor-pointer select-none"
        onClick={onOpen}
      >
        <div className="relative p-2 md:p-3 bg-foreground/5 border border-foreground/10 shadow-2xl transition-all duration-300 hover:border-arena/35 hover:shadow-[0_20px_40px_-20px_hsl(0_65%_50%_/_0.25)]">
          <div className="border border-foreground/5 p-1">
            <img
              src={work.immagine_url}
              alt={work.titolo}
              className="w-40 h-40 md:w-56 md:h-56 lg:w-64 lg:h-64 object-cover"
              loading="lazy"
              draggable={false}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent pointer-events-none" />
        </div>

        <div className="mt-3 text-center">
          <p className="font-display text-sm md:text-base font-semibold text-foreground">{work.titolo}</p>
          <p className="text-muted-foreground text-xs tracking-wider">{work.autore}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Gallery = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null);
  const [opere, setOpere] = useState<GalleryWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastScrollLeft = useRef(0);
  const velocityTimeout = useRef<ReturnType<typeof setTimeout>>();
  const scrollFrame = useRef<number | null>(null);
  const pendingVelocity = useRef(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("opere")
        .select("id, titolo, immagine_url, autore, storia, social_link")
        .eq("is_in_gallery", true);

      if (error) {
        console.error("Gallery: errore caricamento opere", error);
      } else {
        setOpere(data || []);
      }
      setIsLoading(false);
    })();
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const currentScroll = scrollRef.current.scrollLeft;
    const delta = currentScroll - lastScrollLeft.current;
    lastScrollLeft.current = currentScroll;

    const clampedVelocity = Math.max(-15, Math.min(15, delta * 0.3));
    pendingVelocity.current = clampedVelocity;
    if (scrollFrame.current === null) {
      scrollFrame.current = requestAnimationFrame(() => {
        setScrollVelocity(pendingVelocity.current);
        scrollFrame.current = null;
      });
    }

    if (velocityTimeout.current) clearTimeout(velocityTimeout.current);
    velocityTimeout.current = setTimeout(() => setScrollVelocity(0), 100);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      if (velocityTimeout.current) clearTimeout(velocityTimeout.current);
    };
  }, [handleScroll]);

  return (
    <div className="min-h-screen gallery-bg pt-24 pb-20 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[10, 25, 45, 65, 80, 95].map((pos, i) => (
          <motion.div
            key={i}
            className="light-beam"
            style={{ left: `${pos}%` }}
            animate={{ opacity: [0.2, 0.5, 0.2], height: [200, 350, 200] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
          />
        ))}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/8 via-primary/3 to-transparent blur-xl" />
      </div>

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 px-6"
        >
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-[0.2em] text-foreground">
            GALLERIA
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mt-3 font-body">
            Le opere vincitrici — Esposizione permanente
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-foreground/10" />

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase font-body">Caricamento...</p>
            </div>
          ) : opere.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-20 h-20 rounded-full border-2 border-border/20 flex items-center justify-center mb-6">
                <div className="w-12 h-12 rounded-full border border-border/10" />
              </div>
              <p className="text-muted-foreground/60 text-lg font-display tracking-wide">In attesa del vincitore del mese...</p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-8 md:gap-14 px-8 md:px-20 overflow-x-auto pb-10 pt-2 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {opere.map((work, i) => (
                <div key={work.id} className="flex-shrink-0">
                  <HangingFrame
                    work={work}
                    index={i}
                    scrollVelocity={scrollVelocity}
                    onOpen={() => setSelectedWork(work)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-muted-foreground/50 text-xs tracking-widest uppercase mt-8 font-body"
        >
          Scorri per esplorare · Tocca per i dettagli
        </motion.p>
      </div>

      <ArtworkDetailModal
        open={!!selectedWork}
        onClose={() => setSelectedWork(null)}
        imageSrc={selectedWork?.immagine_url ?? ""}
        imageAlt={selectedWork?.titolo ?? ""}
        titleId="gallery-detail-title"
      >
        {selectedWork ? (
          <>
            <p className="text-[10px] font-body tracking-[0.25em] text-muted-foreground uppercase">
              Galleria permanente
            </p>
            <h2
              id="gallery-detail-title"
              className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            >
              {selectedWork.titolo}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-foreground">
              <span className="font-medium">{selectedWork.autore}</span>
              {getInstagramProfile(selectedWork.social_link) ? (
                <>
                  <span className="text-muted-foreground">·</span>
                  <a
                    href={getInstagramProfile(selectedWork.social_link)?.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-arena transition-colors hover:text-foreground hover:underline"
                  >
                    @{getInstagramProfile(selectedWork.social_link)?.username}
                  </a>
                </>
              ) : null}
            </div>
            <p className="text-pretty font-body text-base leading-relaxed text-muted-foreground md:text-lg">
              {selectedWork.storia}
            </p>
          </>
        ) : null}
      </ArtworkDetailModal>
    </div>
  );
};

export default Gallery;
