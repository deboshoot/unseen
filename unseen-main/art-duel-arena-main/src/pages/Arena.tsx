import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import samplePhoto1 from "@/assets/sample-photo-1.jpg";
import samplePhoto2 from "@/assets/sample-photo-2.jpg";

const challengers = [
  {
    id: 1,
    title: "Neon Rain",
    author: "Yuki Tanaka",
    image: samplePhoto1,
    votes: 127,
    story: "Scattata durante una notte di pioggia a Tokyo. La luce dei neon si rifletteva sull'asfalto bagnato creando un mondo parallelo sotto i piedi.",
    social: "@yukitanaka",
  },
  {
    id: 2,
    title: "L'Albero del Tempo",
    author: "Marco Bianchi",
    image: samplePhoto2,
    votes: 98,
    story: "Un albero solitario sulla collina vicino a casa mia. L'ho fotografato all'alba quando la nebbia avvolgeva tutto tranne la sua silhouette.",
    social: "@marcobianchi.photo",
  },
];

const Arena = () => {
  const [introPhase, setIntroPhase] = useState(0);
  const [introComplete, setIntroComplete] = useState(false);
  const [selectedWork, setSelectedWork] = useState<typeof challengers[0] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });

  // Scroll-driven intro phases
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      if (introComplete) return;
      if (v < 0.15) setIntroPhase(0);
      else if (v < 0.3) setIntroPhase(1);
      else if (v < 0.5) setIntroPhase(2);
      else if (v < 0.65) setIntroPhase(3);
      else if (v < 0.8) setIntroPhase(4);
      else {
        setIntroPhase(5);
        setIntroComplete(true);
      }
    });
    return unsubscribe;
  }, [scrollYProgress, introComplete]);

  // Countdown
  const [timeLeft, setTimeLeft] = useState({ hours: 18, minutes: 42, seconds: 15 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!introComplete) {
    return (
      <div ref={containerRef} className="h-[500vh] relative">
        <div className="sticky top-0 h-screen overflow-hidden arena-bg flex items-center justify-center">
          {/* Phase 0: Scroll prompt */}
          <AnimatePresence mode="wait">
            {introPhase === 0 && (
              <motion.div
                key="scroll-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <motion.p
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-muted-foreground text-sm tracking-[0.3em] uppercase font-body"
                >
                  Scorri per entrare nell'Arena
                </motion.p>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mt-6 mx-auto w-[1px] h-12 bg-gradient-to-b from-arena/50 to-transparent"
                />
              </motion.div>
            )}

            {/* Phase 1: Challenger 1 title */}
            {introPhase === 1 && (
              <motion.div
                key="c1-title"
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <span className="font-display text-6xl md:text-9xl font-black text-gradient-arena tracking-wider">
                  SFIDANTE I
                </span>
              </motion.div>
            )}

            {/* Phase 2: Challenger 1 photo */}
            {introPhase === 2 && (
              <motion.div
                key="c1-photo"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ x: -500, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-64 h-64 md:w-80 md:h-80 relative"
              >
                <div className="absolute inset-0 border-2 border-foreground/20 p-2">
                  <img src={challengers[0].image} alt={challengers[0].title} className="w-full h-full object-cover" />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -bottom-10 left-0 right-0 text-center text-foreground font-display text-xl tracking-wider"
                >
                  {challengers[0].title}
                </motion.p>
              </motion.div>
            )}

            {/* Phase 3: Challenger 2 title */}
            {introPhase === 3 && (
              <motion.div
                key="c2-title"
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <span className="font-display text-6xl md:text-9xl font-black text-gradient-arena tracking-wider">
                  SFIDANTE II
                </span>
              </motion.div>
            )}

            {/* Phase 4: Challenger 2 photo */}
            {introPhase === 4 && (
              <motion.div
                key="c2-photo"
                initial={{ scale: 0, rotate: 10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="w-64 h-64 md:w-80 md:h-80 relative"
              >
                <div className="absolute inset-0 border-2 border-foreground/20 p-2">
                  <img src={challengers[1].image} alt={challengers[1].title} className="w-full h-full object-cover" />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -bottom-10 left-0 right-0 text-center text-foreground font-display text-xl tracking-wider"
                >
                  {challengers[1].title}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Red ambient particles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: 150 + i * 60,
                height: 150 + i * 60,
                left: `${10 + i * 25}%`,
                top: `${20 + (i % 2) * 40}%`,
                background: `hsl(0 50% 30% / ${0.1 + i * 0.03})`,
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5 + i, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen arena-bg pt-24 px-4">
      {/* Red abstract 3D background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-arena/5 blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-arena/8 blur-[80px]" />
        {/* 3D perspective lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1920 1080">
          <line x1="960" y1="540" x2="0" y2="0" stroke="hsl(0 65% 50%)" strokeWidth="1" />
          <line x1="960" y1="540" x2="1920" y2="0" stroke="hsl(0 65% 50%)" strokeWidth="1" />
          <line x1="960" y1="540" x2="0" y2="1080" stroke="hsl(0 65% 50%)" strokeWidth="1" />
          <line x1="960" y1="540" x2="1920" y2="1080" stroke="hsl(0 65% 50%)" strokeWidth="1" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 max-w-5xl mx-auto"
      >
        {/* Countdown */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-xs tracking-[0.4em] uppercase font-body mb-3">
            Tempo rimanente
          </p>
          <div className="flex justify-center gap-3">
            {[
              { val: timeLeft.hours, label: "ORE" },
              { val: timeLeft.minutes, label: "MIN" },
              { val: timeLeft.seconds, label: "SEC" },
            ].map((t, i) => (
              <div key={i} className="glass rounded-lg px-4 py-3 min-w-[70px] glow-red">
                <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {String(t.val).padStart(2, "0")}
                </span>
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground mt-1">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Duel */}
        <div className="flex items-center justify-center gap-3 md:gap-8">
          {/* Challenger 1 */}
          <ChallengerCard
            challenger={challengers[0]}
            side="left"
            onSelect={() => setSelectedWork(challengers[0])}
          />

          {/* VS Symbol - 3D style */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="relative"
              style={{ perspective: "200px" }}
            >
              <div className="font-display text-3xl md:text-5xl font-black text-arena relative"
                style={{
                  textShadow: "0 0 20px hsl(0 65% 50% / 0.5), 0 4px 8px hsl(0 0% 0% / 0.5)",
                  transform: "perspective(200px) rotateX(10deg)",
                }}
              >
                VS
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-0 bg-arena/20 blur-xl rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          {/* Challenger 2 */}
          <ChallengerCard
            challenger={challengers[1]}
            side="right"
            onSelect={() => setSelectedWork(challengers[1])}
          />
        </div>

        {/* Vote buttons */}
        <div className="flex justify-center gap-6 mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass glow-red px-6 py-3 rounded-lg font-display text-sm tracking-wider uppercase text-foreground"
          >
            Vota Sfidante I
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass glow-red px-6 py-3 rounded-lg font-display text-sm tracking-wider uppercase text-foreground"
          >
            Vota Sfidante II
          </motion.button>
        </div>
      </motion.div>

      {/* Full-screen photo detail */}
      <AnimatePresence>
        {selectedWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
            onClick={() => setSelectedWork(null)}
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
                onClick={() => setSelectedWork(null)}
                className="absolute -top-12 right-0 text-muted-foreground hover:text-foreground font-body text-sm tracking-wider"
              >
                CHIUDI ✕
              </button>
              <img
                src={selectedWork.image}
                alt={selectedWork.title}
                className="w-full rounded-lg"
              />
              <div className="mt-8 space-y-4">
                <h2 className="font-display text-3xl font-bold">{selectedWork.title}</h2>
                <p className="text-primary font-body text-sm tracking-wider">{selectedWork.author} · {selectedWork.social}</p>
                <p className="text-muted-foreground font-body leading-relaxed">{selectedWork.story}</p>
                <p className="font-display text-lg">{selectedWork.votes} voti</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ChallengerCard = ({
  challenger,
  side,
  onSelect,
}: {
  challenger: typeof challengers[0];
  side: "left" | "right";
  onSelect: () => void;
}) => (
  <motion.div
    initial={{ x: side === "left" ? -100 : 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="flex-1 max-w-[200px] md:max-w-[280px] cursor-pointer group"
    onClick={onSelect}
  >
    <div className="relative aspect-square border border-foreground/10 p-1.5 md:p-2 transition-all duration-300 group-hover:border-arena/40">
      <img
        src={challenger.image}
        alt={challenger.title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
    <div className="mt-3 text-center">
      <p className="font-display text-sm md:text-base font-semibold text-foreground truncate">{challenger.title}</p>
      <p className="text-muted-foreground text-xs tracking-wider">{challenger.author}</p>
    </div>
  </motion.div>
);

export default Arena;
