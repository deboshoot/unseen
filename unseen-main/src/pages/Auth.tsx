import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/arena";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Login effettuato", {
          description: "Benvenuto nell'Arena!",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Registrazione effettuata", {
          description: "Controlla la tua email per confermare l'account.",
        });
      }
      navigate(redirectTo);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Errore sconosciuto";
      toast.error(isLogin ? "Login fallito" : "Registrazione fallita", {
        description: msg,
      });
    } finally {
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
            {isLogin ? "Accedi" : "Registrati"}
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-8">
            {isLogin
              ? "Accedi per votare nell'Arena"
              : "Crea un account per partecipare ai duelli"}
          </p>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-arena focus:ring-2 focus:ring-arena/20 outline-none transition-all"
                placeholder="la.tua@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-border/60 bg-background/50 px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:border-arena focus:ring-2 focus:ring-arena/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl border border-arena/35 bg-arena/10 py-3.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Non hai un account? " : "Hai già un account? "}
              <span className="text-arena font-semibold">
                {isLogin ? "Registrati" : "Accedi"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
