import { motion } from "framer-motion";
import { ArrowDown, Camera, ShieldCheck } from "lucide-react";
import InviaOpera from "@/components/InviaOpera";
import { useI18n } from "@/i18n/I18nProvider";

const Submit = () => {
  const { t } = useI18n();
  return (
    <div className="submit-page min-h-screen bg-background px-5 pb-24 pt-28 sm:px-8 md:pt-36">
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

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="submit-heading mb-12 text-center md:mb-16"
        >
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {t("submit.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground sm:text-base">
            {t("submit.subtitle")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground/70">
            <ArrowDown size={15} />
            <span className="font-body text-[10px] uppercase tracking-[0.25em]">La tua fotografia, al centro</span>
          </div>
        </motion.div>

        <InviaOpera />

        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground/70 sm:flex-row sm:gap-8">
          <span className="inline-flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.2em]"><Camera size={14} className="text-primary" /> JPG, PNG o WEBP</span>
          <span className="inline-flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.2em]"><ShieldCheck size={14} className="text-primary" /> Revisione editoriale</span>
        </div>
      </div>
    </div>
  );
};

export default Submit;
