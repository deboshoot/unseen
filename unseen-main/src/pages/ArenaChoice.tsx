import { ArrowUpRight, Camera, Disc3 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Arena from "./Arena";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";

export default function ArenaChoice() {
  const [params] = useSearchParams();
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  // Preserve links to existing photographic duels and shared photographs.
  if (params.has("duelId") || params.has("photoId")) return <Arena />;

  return (
    <main className="arena-choice min-h-screen px-5 pb-20 pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 text-center">
          <p className="arena-eyebrow">UNSEEN / ARENA</p>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-tight sm:text-6xl">{copy.choose}</h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground">{copy.chooseIntro}</p>
        </header>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link to="/arena/fotografica" className="arena-choice-card arena-choice-photo group">
            <div className="arena-choice-art photo-choice-art" aria-hidden="true"><Camera size={76} strokeWidth={1} /><span className="choice-frame" /></div>
            <div className="arena-choice-copy"><p className="arena-eyebrow">01 / VISUAL</p><h2>{copy.photography}</h2><p>{copy.photoDescription}</p><span className="arena-choice-enter">{copy.enter}<ArrowUpRight size={19} /></span></div>
          </Link>
          <Link to="/arena/musicale" className="arena-choice-card arena-choice-music group">
            <span className="choice-new">{copy.new}</span>
            <div className="arena-choice-art music-choice-art" aria-hidden="true"><div className="choice-vinyl"><Disc3 size={62} strokeWidth={1} /></div></div>
            <div className="arena-choice-copy"><p className="arena-eyebrow">02 / SOUND</p><h2>{copy.music}</h2><p>{copy.musicDescription}</p><span className="arena-choice-enter">{copy.enter}<ArrowUpRight size={19} /></span></div>
          </Link>
        </div>
      </div>
    </main>
  );
}
