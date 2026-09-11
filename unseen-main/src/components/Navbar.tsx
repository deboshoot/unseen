import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut } from "lucide-react";
import { supabase } from "@/supabaseClient";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Arena", path: "/arena" },
  { label: "Galleria", path: "/gallery" },
  { label: "Come Funziona", path: "/how-it-works" },
  { label: "Invia Opera", path: "/submit" },
];

const Navbar = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-black tracking-[0.3em] text-foreground">
          <img src="/unseen-logo-transparent.png" alt="" className="h-8 w-8 object-contain" />
          <span>UNSEEN</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative font-body text-sm tracking-wider uppercase transition-colors duration-300 ${
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
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                aria-label="Apri profilo"
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
                    Logout
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
              <span>Accedi</span>
            </Link>
          )}
        </div>
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <MobileMenu user={user} onSignOut={handleSignOut} />
        </div>
      </div>
    </motion.nav>
  );
};

const MobileMenu = ({ user, onSignOut }: { user: User | null; onSignOut: () => Promise<void> }) => {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground p-2"
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
        className="absolute top-full left-0 right-0 bg-[#0a0a0a] border-b border-border/40 overflow-hidden"
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
              <span>Accedi / Iscriviti</span>
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Navbar;
