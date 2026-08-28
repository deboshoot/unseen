import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen marble-bg relative overflow-hidden">
      {/* Hero Background */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
      </div>

      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-primary/3 blur-[100px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.h1
            className="font-display text-5xl md:text-7xl font-black tracking-[0.4em] text-foreground leading-none"
            initial={{ letterSpacing: "1em", opacity: 0 }}
            animate={{ letterSpacing: "0.4em", opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            UNSEEN
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-muted-foreground text-lg md:text-xl tracking-widest uppercase mt-6 font-body"
        >
          Galleria d'Arte Digitale
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="text-muted-foreground/70 text-sm md:text-base max-w-lg mt-4 font-body leading-relaxed"
        >
          Dove le fotografie si sfidano, il pubblico decide, e solo le migliori entrano nella galleria permanente.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 mt-12"
        >
          <Link to="/arena">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 glass glow-primary rounded-lg font-display text-sm tracking-[0.2em] uppercase text-foreground transition-all hover:bg-primary/10"
            >
              Entra nell'Arena
            </motion.button>
          </Link>
          <Link to="/gallery">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 glass rounded-lg font-display text-sm tracking-[0.2em] uppercase text-muted-foreground transition-all hover:text-foreground"
            >
              Visita la Galleria
            </motion.button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-[1px] h-16 bg-gradient-to-b from-transparent via-primary/50 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
