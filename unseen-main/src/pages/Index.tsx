import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen home-hero-bg relative overflow-hidden">
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
          <Link to="/arena" className="block">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="home-cta w-full sm:w-auto"
            >
              Entra nell'Arena
            </motion.button>
          </Link>
          <Link to="/gallery" className="block">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="home-cta w-full sm:w-auto"
            >
              Visita la Galleria
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
