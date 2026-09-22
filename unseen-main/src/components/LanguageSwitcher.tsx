import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { localeLabels, supportedLocales, type Locale } from "@/i18n";

const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("common.selectLanguage")}
        aria-expanded={open}
        className="group flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background/35 px-3 text-muted-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary/70 hover:bg-primary/[0.06] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <Globe2 size={14} className="text-primary transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
        <span className="font-body text-[11px] font-bold tracking-[0.16em] text-foreground">{localeLabels[locale]}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.6rem)] z-[60] w-44 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-1.5 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <p className="px-3 pb-2 pt-2 font-body text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t("common.language")}</p>
          {supportedLocales.map((supportedLocale) => {
            const selected = supportedLocale === locale;
            return <button
              key={supportedLocale}
              type="button"
              onClick={() => { void setLocale(supportedLocale as Locale); setOpen(false); }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-body text-xs font-semibold tracking-wide transition-colors ${selected ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"}`}
            >
              <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-primary" : "bg-border"}`} />{localeLabels[supportedLocale]}</span>
              <span className="text-[10px] uppercase tracking-wider">{supportedLocale}</span>
              {selected && <Check size={14} aria-hidden="true" />}
            </button>;
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
