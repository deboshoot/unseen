import { motion } from "framer-motion";
import InviaOpera from "@/components/InviaOpera";

const Submit = () => {
  return (
    <div className="min-h-screen gallery-bg pt-24 pb-20 px-6 relative">
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

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-[0.2em] text-foreground">
            INVIA L'OPERA
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mt-3 font-body">
            Condividi la tua visione con il mondo
          </p>
        </motion.div>

        <InviaOpera />
      </div>
    </div>
  );
};

export default Submit;
