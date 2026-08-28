import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import samplePhoto1 from "@/assets/sample-photo-1.jpg";
import samplePhoto2 from "@/assets/sample-photo-2.jpg";
import samplePhoto3 from "@/assets/sample-photo-3.jpg";
import samplePhoto4 from "@/assets/sample-photo-4.jpg";
import samplePhoto5 from "@/assets/sample-photo-5.jpg";

const galleryWorks = [
  { id: 1, title: "Neon Rain", author: "Yuki Tanaka", image: samplePhoto1, month: "Marzo 2026", story: "Scattata durante una notte di pioggia a Tokyo. La luce dei neon si rifletteva sull'asfalto bagnato.", social: "@yukitanaka" },
  { id: 2, title: "L'Albero del Tempo", author: "Marco Bianchi", image: samplePhoto2, month: "Febbraio 2026", story: "Un albero solitario sulla collina. L'ho fotografato all'alba quando la nebbia avvolgeva tutto.", social: "@marcobianchi.photo" },
  { id: 3, title: "Il Fotografo", author: "Elena Rossi", image: samplePhoto3, month: "Gennaio 2026", story: "Un autoritratto nel riflesso di una vetrina parigina, tra luci e ombre urbane.", social: "@elenarossi" },
  { id: 4, title: "Geometrie Celesti", author: "Luca Verdi", image: samplePhoto4, month: "Dicembre 2025", story: "Le linee architettoniche del Museo del Futuro a Dubai, dove geometria e cielo si fondono.", social: "@lucaverdi.art" },
  { id: 5, title: "Forza del Mare", author: "Sara Costa", image: samplePhoto5, month: "Novembre 2025", story: "La potenza delle onde atlantiche sulla costa portoghese catturata con una lunga esposizione.", social: "@saracosta" },
];

const HangingFrame = ({ work, index, scrollVelocity }: { work: typeof galleryWorks[0]; index: number; scrollVelocity: number }) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // Scroll-driven oscillation
  const swingAngle = useMotionValue(0);
  const springSwing = useSpring(swingAngle, { stiffness: 60, damping: 8, mass: 0.8 });

  useEffect(() => {
    // Offset each frame slightly for natural staggered swinging
    const delay = index * 50;
    const timeout = setTimeout(() => {
      swingAngle.set(scrollVelocity * (0.8 + index * 0.15));
    }, delay);
    return () => clearTimeout(timeout);
  }, [scrollVelocity, index, swingAngle]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        {/* Wire */}
        <div className="w-[1px] h-12 md:h-20 bg-gradient-to-b from-foreground/30 to-foreground/10" />

        {/* Frame with scroll-driven pendulum */}
        <motion.div
          style={{ rotate: springSwing, transformOrigin: "top center" }}
          className="cursor-pointer select-none"
          onClick={() => setShowInfo(true)}
        >
          <div className="relative p-2 md:p-3 bg-foreground/5 border border-foreground/10 shadow-2xl transition-all duration-300 hover:border-primary/30 hover:shadow-primary/10">
            <div className="border border-foreground/5 p-1">
              <img
                src={work.image}
                alt={work.title}
                className="w-40 h-40 md:w-56 md:h-56 lg:w-64 lg:h-64 object-cover"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] to-transparent pointer-events-none" />
          </div>
          
          <div className="mt-3 text-center">
            <p className="font-display text-sm md:text-base font-semibold text-foreground">{work.title}</p>
            <p className="text-muted-foreground text-xs tracking-wider">{work.author}</p>
            <p className="text-primary/60 text-[10px] tracking-[0.2em] uppercase mt-1">{work.month}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Info overlay */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
            onClick={() => setShowInfo(false)}
          >
            <div className="absolute inset-0 detail-overlay-bg backdrop-blur-lg" />
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="relative z-10 max-w-3xl w-full mx-4 my-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowInfo(false)}
                className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground font-body text-sm tracking-wider"
              >
                CHIUDI ✕
              </button>
              <img
                src={work.image}
                alt={work.title}
                className="w-full rounded-lg"
              />
              <div className="mt-8 space-y-4">
                <h2 className="font-display text-3xl font-bold text-foreground">{work.title}</h2>
                <p className="text-primary font-body text-sm tracking-wider">{work.author} · {work.social}</p>
                <p className="text-muted-foreground font-body leading-relaxed">{work.story}</p>
                <p className="text-primary/60 text-xs tracking-[0.2em] uppercase">{work.month}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Gallery = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollLeft = useRef(0);
  const velocityTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const currentScroll = scrollRef.current.scrollLeft;
    const delta = currentScroll - lastScrollLeft.current;
    lastScrollLeft.current = currentScroll;
    
    // Clamp velocity for natural feel
    const clampedVelocity = Math.max(-15, Math.min(15, delta * 0.3));
    setScrollVelocity(clampedVelocity);

    // Reset velocity after scrolling stops
    if (velocityTimeout.current) clearTimeout(velocityTimeout.current);
    velocityTimeout.current = setTimeout(() => setScrollVelocity(0), 100);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen gallery-bg pt-24 pb-20 relative overflow-hidden">
      {/* Light beams from below */}
      {[10, 25, 45, 65, 80, 95].map((pos, i) => (
        <motion.div
          key={i}
          className="light-beam"
          style={{ left: `${pos}%` }}
          animate={{ opacity: [0.2, 0.5, 0.2], height: [200, 350, 200] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}
      
      {/* Extra bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/8 via-primary/3 to-transparent blur-xl pointer-events-none" />

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

          <div
            ref={scrollRef}
            className="flex gap-8 md:gap-14 px-8 md:px-20 overflow-x-auto pb-10 pt-2 scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {galleryWorks.map((work, i) => (
              <div key={work.id} className="flex-shrink-0">
                <HangingFrame work={work} index={i} scrollVelocity={scrollVelocity} />
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default Gallery;
