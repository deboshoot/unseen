import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/arena";

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error("Accesso con Google fallito", { description: msg });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen arena-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-2xl border border-border/60 bg-gradient-to-b from-white/[0.05] to-transparent p-8">
          <h1 className="font-display text-3xl font-bold text-foreground text-center mb-2">
            Accedi all'Arena
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            Registrati o accedi con il tuo account Google per votare.
          </p>

          <div className="space-y-3">
            <motion.button
              type="button"
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="w-full rounded-xl border border-arena/35 bg-arena/10 py-3.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Caricamento..." : "Registrati"}
            </motion.button>
            <motion.button
              type="button"
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/60 py-3.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-foreground/40 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4285f4]">G</span>
              Accedi con Google
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
