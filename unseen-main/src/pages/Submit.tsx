import { motion } from "framer-motion";
import { Camera, Music2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import InviaOpera from "@/components/InviaOpera";
import InviaBrano from "@/components/InviaBrano";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";
import { musicSubmitCopy } from '@/i18n/music-submit-copy';
import '@/music-submit.css';

const Submit = () => {
  const { t, locale } = useI18n();
  const copy = musicCopy[locale];
  const studioCopy = musicSubmitCopy[locale];
  const [params, setParams] = useSearchParams();
  const isMusic = params.get("tipo") === "musica";
  return (
    <main className={`submit-page submit-experience ${isMusic ? 'music-studio-page' : ''} min-h-screen px-5 pb-24 pt-28 sm:px-8 md:pt-36`}>
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`submit-heading mb-12 text-center md:mb-14 ${isMusic ? 'music-studio-hero' : ''}`}
        >
          <p className="music-studio-badge"><span />UNSEEN / {isMusic ? studioCopy.badge : 'OPEN CALL'}</p>
          <h1 className="font-display text-4xl font-black tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {isMusic ? studioCopy.heading : t("submit.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground sm:text-base">
            {isMusic ? studioCopy.intro : t("submit.subtitle")}
          </p>
          <div className="submit-heading-meta mt-7">
            <span>{isMusic ? studioCopy.maxClip : "La tua fotografia, al centro"}</span>
            <i aria-hidden="true" />
            <span>{isMusic ? "01 — 03" : "01 — 02"}</span>
          </div>
        </motion.div>

        <div className="submit-type-switch mb-8" role="group" aria-label={copy.choose}>
          <button type="button" aria-pressed={!isMusic} className={!isMusic ? "is-selected" : ""} onClick={() => setParams({})}><Camera size={17} />{copy.photography}</button>
          <button type="button" aria-pressed={isMusic} className={isMusic ? "is-selected" : ""} onClick={() => setParams({ tipo: "musica" })}><Music2 size={17} />{copy.music}</button>
        </div>
        {isMusic ? <InviaBrano /> : <InviaOpera />}

        <div className="submit-format-notes mt-10 flex flex-col items-center justify-center gap-4 text-center text-muted-foreground/70 sm:flex-row sm:gap-8">
          <span className="inline-flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.2em]">{isMusic ? <Music2 size={14} className="text-primary" /> : <Camera size={14} className="text-primary" />}{isMusic ? "MP3 / WAV + JPG / PNG / WEBP" : "JPG, PNG o WEBP"}</span>
          <span className="inline-flex items-center gap-2 font-body text-[10px] uppercase tracking-[0.2em]"><ShieldCheck size={14} className="text-primary" /> Revisione editoriale</span>
        </div>
      </div>
    </main>
  );
};

export default Submit;
