import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl font-black tracking-[0.3em] text-foreground">
          UNSEEN
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
        </div>
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </motion.nav>
  );
};

const MobileMenu = () => {
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
        className="absolute top-full left-0 right-0 glass-strong overflow-hidden"
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
        </div>
      </motion.div>
    </div>
  );
};

export default Navbar;
