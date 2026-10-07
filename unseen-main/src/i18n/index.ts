import type { ComponentType } from "react";
import it from "@/locales/it.json";
import type en from "@/locales/en.json";
import type es from "@/locales/es.json";
import type fr from "@/locales/fr.json";
import type de from "@/locales/de.json";

export const supportedLocales = ["it", "en", "es", "fr", "de"] as const;
export type Locale = (typeof supportedLocales)[number];
export type Dictionary = typeof it | typeof en | typeof es | typeof fr | typeof de;

const localeLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  it: async () => ({ default: it }),
  en: () => import("@/locales/en.json"),
  es: () => import("@/locales/es.json"),
  fr: () => import("@/locales/fr.json"),
  de: () => import("@/locales/de.json"),
};

export const localeLabels: Record<Locale, string> = {
  it: "IT",
  en: "EN",
  es: "ES",
  fr: "FR",
  de: "DE",
};

export const localeStorageKey = "unseen-locale";

export const normalizeLocale = (value?: string | null): Locale => {
  const language = value?.toLowerCase().split("-")[0];
  return supportedLocales.includes(language as Locale) ? language as Locale : "it";
};

export const getInitialLocale = (): Locale => {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(localeStorageKey);
    if (saved) return normalizeLocale(saved);
    return normalizeLocale(window.navigator.language);
  }
  return "it";
};

export const loadLocale = async (locale: Locale): Promise<Dictionary> => {
  const module = await localeLoaders[locale]();
  return module.default;
};

export const getTranslation = (dictionary: Dictionary, path: string): unknown => {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key];
    return undefined;
  }, dictionary);
};

export type { ComponentType };
