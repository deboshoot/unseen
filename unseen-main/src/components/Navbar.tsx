import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut } from "lucide-react";
import { supabase } from "@/supabaseClient";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

const Navbar = () => {
  const location = useLocation();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.arena"), path: "/arena" },
    { label: t("nav.gallery"), path: "/gallery" },
    { label: t("nav.rules"), path: "/regolamento" },
    { label: t("nav.submit"), path: "/submit" },
  ];

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="site-navbar fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="site-navbar-inner mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="site-brand flex min-w-0 items-center gap-1.5 font-display text-lg font-black tracking-[0.2em] text-foreground sm:gap-2 sm:text-2xl sm:tracking-[0.3em]">
          <img src="/unseen-logo-transparent.png" alt="" className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8" />
          <span>UNSEEN</span>
        </Link>
        <div className="site-nav-links hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`site-nav-link relative font-body text-sm tracking-wider uppercase transition-colors duration-300 ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {location.pathname === item.path && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                aria-label={t("nav.profile")}
                aria-expanded={profileOpen}
              >
                <User size={18} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 min-w-48 rounded-xl border border-border/60 bg-background/95 p-2 shadow-xl backdrop-blur-sm">
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground">{user.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-foreground/10"
                  >
                    <LogOut size={16} />
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 font-body text-sm tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <User size={16} />
              <span>{t("nav.login")}</span>
            </Link>
          )}
        </div>
        <div className="site-mobile-actions flex shrink-0 items-center gap-1.5 sm:gap-3 md:hidden">
          <ThemeToggle />
          <LanguageSwitcher />
          <MobileMenu user={user} onSignOut={handleSignOut} navItems={navItems} />
        </div>
      </div>
    </motion.nav>
  );
};

const MobileMenu = ({ user, onSignOut, navItems }: { user: User | null; onSignOut: () => Promise<void>; navItems: { label: string; path: string }[] }) => {
  const location = useLocation();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="site-menu-trigger p-2 text-foreground"
      >
        <div className="space-y-1.5">
          <motion.span
            animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            className="block w-6 h-[2px] bg-foreground"
          />
          <motion.span
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            className="block w-6 h-[2px] bg-foreground"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            className="block w-6 h-[2px] bg-foreground"
          />
        </div>
      </button>
      <motion.div
        initial={false}
        animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="site-mobile-panel absolute left-0 right-0 top-full overflow-hidden"
      >
        <div className="p-6 flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`font-body text-sm tracking-wider uppercase ${
                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
              className="flex items-center gap-2 border-t border-border/40 pt-4 text-left font-body text-sm tracking-wider uppercase text-muted-foreground hover:text-foreground"
              aria-label="Logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 border-t border-border/40 pt-4 font-body text-sm tracking-wider uppercase ${
                location.pathname === "/auth" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <User size={16} />
              <span>{t("nav.loginOrRegister")}</span>
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Navbar;
