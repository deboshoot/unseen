import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem("unseen-theme") === "light";
  });
  const { t } = useI18n();

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add("light-mode");
      localStorage.setItem("unseen-theme", "light");
    } else {
      document.documentElement.classList.remove("light-mode");
      localStorage.setItem("unseen-theme", "dark");
    }
  }, [isLight]);

  // Apply on mount
  useEffect(() => {
    if (localStorage.getItem("unseen-theme") === "light") {
      document.documentElement.classList.add("light-mode");
    }
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setIsLight(!isLight)}
      className="site-theme-toggle flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70 transition-colors hover:text-foreground sm:h-9 sm:w-9"
      title={isLight ? t("theme.dark") : t("theme.light")}
    >
      {isLight ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </motion.button>
  );
};

export default ThemeToggle;
