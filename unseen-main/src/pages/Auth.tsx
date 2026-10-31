import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { loginDestination } from "@/lib/auth-redirect";
import Starfield from "@/components/home/Starfield";
import "@/home-experience.css";
import "@/auth.css";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const redirectTo = loginDestination(searchParams.get("redirect"));
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const title = t("auth.title").split(" ");
  const finalWord = title.pop();

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?${new URLSearchParams({ redirect: redirectTo })}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = error instanceof Error ? error.message : t("common.error");
      toast.error(t("auth.signInFailed"), { description: msg });
      setLoading(false);
    }
  };

  return (
    <main className="auth-page" aria-labelledby="auth-title">
      <Starfield />
      <motion.section
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="auth-access"
        aria-busy={loading}
      >
        <header className="auth-heading">
          <p className="auth-eyebrow"><i aria-hidden="true" />UNSEEN / COMMUNITY</p>
          <h1 id="auth-title" aria-label={t("auth.title")}>
            {title.join(" ")} <em>{finalWord}<span>.</span></em>
          </h1>
          <p className="auth-description">{t("auth.description")}</p>
        </header>
          <div className="auth-actions">
            <motion.button
              type="button"
              disabled={loading}
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="auth-button auth-register"
            >
              <span>{loading ? t("auth.loading") : t("auth.register")}</span>
              {loading ? <LoaderCircle className="auth-loading" size={18} aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}
            </motion.button>
            <motion.button
              type="button"
              disabled={loading}
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={reduced ? undefined : { scale: 0.98 }}
              onClick={handleGoogleSignIn}
              className="auth-button auth-google"
            >
              <span className="auth-google-mark" aria-hidden="true">G</span>
              {t("auth.signInGoogle")}
            </motion.button>
          </div>
        <footer className="auth-signature"><span>UNSEEN</span><i aria-hidden="true" /><span>INDEPENDENT CULTURE</span></footer>
      </motion.section>
    </main>
  );
};

export default Auth;
