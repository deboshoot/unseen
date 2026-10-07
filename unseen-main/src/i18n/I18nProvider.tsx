import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getInitialLocale, getTranslation, loadLocale, localeStorageKey, type Dictionary, type Locale } from "./index";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (path: string, variables?: Record<string, string | number>) => string;
  list: <T = unknown>(path: string) => T[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ initialLocale, initialDictionary, children }: { initialLocale: Locale; initialDictionary: Dictionary; children: ReactNode }) => {
  const [locale, setCurrentLocale] = useState(initialLocale);
  const [dictionary, setDictionary] = useState(initialDictionary);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  const setLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    const nextDictionary = await loadLocale(nextLocale);
    setDictionary(nextDictionary);
    setCurrentLocale(nextLocale);
  };

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (path, variables) => {
      const raw = getTranslation(dictionary, path);
      if (typeof raw !== "string") return path;
      return Object.entries(variables ?? {}).reduce((text, [key, replacement]) => text.split(`{{${key}}}`).join(String(replacement)), raw);
    },
    list: <T,>(path: string) => {
      const raw = getTranslation(dictionary, path);
      return Array.isArray(raw) ? raw as T[] : [];
    },
  }), [dictionary, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
};

export const resolveInitialI18n = async () => {
  const locale = getInitialLocale();
  return { locale, dictionary: await loadLocale(locale) };
};
