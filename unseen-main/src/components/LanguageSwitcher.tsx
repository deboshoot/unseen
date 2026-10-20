import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { localeLabels, supportedLocales, type Locale } from "@/i18n";

const localeNames: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

const LanguageFlag = ({ locale }: { locale: Locale }) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
    {locale === "it" && <>
      <path fill="#009246" d="M0 0h8v24H0z" />
      <path fill="#f1f2f1" d="M8 0h8v24H8z" />
      <path fill="#ce2b37" d="M16 0h8v24h-8z" />
    </>}
    {locale === "en" && <>
      <path fill="#012169" d="M0 0h24v24H0z" />
      <path fill="#fff" d="m0 0 3 0 21 17v3h-3L0 3zM24 0h-3L0 17v3h3L24 3z" />
      <path fill="#c8102e" d="m0 0 1.5 0L24 18v1.5L22.5 20 0 2zM24 0h-1.5L0 18v1.5L1.5 20 24 2z" />
      <path fill="#fff" d="M9 0h6v24H9zM0 9h24v6H0z" />
      <path fill="#c8102e" d="M10.2 0h3.6v24h-3.6zM0 10.2h24v3.6H0z" />
    </>}
    {locale === "es" && <>
      <path fill="#aa151b" d="M0 0h24v24H0z" />
      <path fill="#f1bf00" d="M0 6h24v12H0z" />
    </>}
    {locale === "fr" && <>
      <path fill="#002395" d="M0 0h8v24H0z" />
      <path fill="#fff" d="M8 0h8v24H8z" />
      <path fill="#ed2939" d="M16 0h8v24h-8z" />
    </>}
    {locale === "de" && <>
      <path fill="#000" d="M0 0h24v8H0z" />
      <path fill="#d00" d="M0 8h24v8H0z" />
      <path fill="#ffce00" d="M0 16h24v8H0z" />
    </>}
  </svg>
);

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
        aria-label={`${t("common.selectLanguage")}: ${localeNames[locale]}`}
        aria-expanded={open}
        className="group flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background/35 px-3 text-muted-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary/70 hover:bg-primary/[0.06] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="h-5 w-5 overflow-hidden rounded-full border border-white/20 shadow-sm transition-transform duration-300 group-hover:scale-110" aria-hidden="true"><LanguageFlag locale={locale} /></span>
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
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 overflow-hidden rounded-full border border-white/20" aria-hidden="true"><LanguageFlag locale={supportedLocale} /></span>
                {localeNames[supportedLocale]}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{localeLabels[supportedLocale]}</span>
              </span>
              {selected && <Check size={14} aria-hidden="true" />}
            </button>;
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
