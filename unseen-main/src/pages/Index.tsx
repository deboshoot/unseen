import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="bg-gradient-to-b from-home-hero-bg to-background">
      <div className="min-h-screen home-hero-bg relative overflow-hidden flex flex-col items-center justify-center px-6 text-center">
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

      <div className="relative overflow-hidden py-24 px-6">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-10 w-96 h-96 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-primary/8 blur-[80px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="relative z-10 flex flex-col items-center justify-center max-w-2xl mx-auto text-center"
        >
          <p className="text-muted-foreground/80 text-xs tracking-[0.3em] uppercase mb-6 font-body">
            Sei un artista?
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
            Metti in gioco le tue opere
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base mb-8 font-body leading-relaxed">
            Condividi le tue migliori creazioni e lascia che il pubblico decide quali meritano di entrare nella galleria permanente.
          </p>
          <Link to="/submit" className="block">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              className="submit-cta"
            >
              Invia la tua opera
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
