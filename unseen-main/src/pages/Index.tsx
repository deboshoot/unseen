import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";

const Index = () => {
  const { t } = useI18n();
  return (
    <div className="home-page bg-background">
      <section className="home-minimal-hero relative flex min-h-[min(820px,100vh)] items-center justify-center overflow-hidden px-6 pb-20 pt-32 md:px-10">
        <div className="home-gallery-wash absolute inset-0" />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-3 font-body text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("home.eyebrow")}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 font-display text-[clamp(2.8rem,6vw,5.2rem)] font-medium leading-[0.9] tracking-[-0.065em] text-foreground"
          >
            UNSEEN
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="mt-8 h-px w-8 bg-primary/70"
          />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.72 }}
            className="mt-7 max-w-sm font-body text-sm leading-7 text-muted-foreground"
          >
            {t("home.tagline")}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.92 }}
            className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
          >
            <Link to="/gallery" className="home-primary-link group w-full justify-center sm:w-auto">
              {t("home.galleryCta")}
              <ArrowUpRight size={17} strokeWidth={2.2} />
            </Link>
            <Link to="/arena" className="home-secondary-link w-full justify-center sm:w-auto">
              {t("home.arenaCta")}
              <ArrowUpRight size={17} strokeWidth={2.2} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">{t("home.ritual")}</p>
              <h2 className="mt-4 max-w-xl font-display text-2xl font-medium leading-tight tracking-[-0.04em] text-foreground md:text-4xl">
                {t("home.headline")}
              </h2>
            </div>
            <p className="max-w-xs font-body text-sm leading-6 text-muted-foreground">{t("home.subheadline")}</p>
          </div>
          <div className="grid border-y border-border/60 md:grid-cols-3">
            {[
              ["01", t("home.arenaTitle"), t("home.arenaText"), "/arena"],
              ["02", t("home.galleryTitle"), t("home.galleryText"), "/gallery"],
              ["03", t("home.artistsTitle"), t("home.artistsText"), "/submit"],
            ].map(([number, title, text]) => (
              <Link key={title} to={title === t("home.arenaTitle") ? "/arena" : title === t("home.galleryTitle") ? "/gallery" : "/submit"} className="group border-b border-border/60 py-7 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <div className="flex items-start justify-between gap-5">
                  <span className="font-body text-xs text-muted-foreground">{number}</span>
                  <ArrowUpRight className="text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary" size={18} />
                </div>
                <h3 className="mt-8 font-display text-2xl tracking-tight text-foreground">{title}</h3>
                <p className="mt-2 max-w-xs font-body text-sm leading-6 text-muted-foreground">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
