import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { isAdminDestination, loginDestination } from '@/lib/auth-redirect';
import { useI18n } from '@/i18n/I18nProvider';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const destination = loginDestination(params.get('redirect'));
  const { t } = useI18n();
  const [revision, setRevision] = useState(0);
  const validation = useRef(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event === 'INITIAL_SESSION') return;
      validation.current++;
      setRevision(value => value + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    let finished = false;
    const version = ++validation.current;
    const go = (path: string) => {
      if (mounted && !finished && version === validation.current) {
        finished = true;
        navigate(path, { replace: true });
      }
    };
    // A failed or stalled permission check must never strand a visitor on an admin screen.
    const timeout = window.setTimeout(() => go('/arena'), 10000);
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted || version !== validation.current) return;
        if (error || !session) { go('/auth'); return; }
        if (isAdminDestination(destination)) {
          const { data: admin, error: roleError } = await supabase.rpc('is_unseen_admin');
          if (roleError || admin !== true) { go('/arena'); return; }
        }
        go(destination);
      } catch { go('/arena'); }
    })();
    return () => { mounted = false; window.clearTimeout(timeout); };
  }, [destination, navigate, revision]);

  return <main className="min-h-screen flex items-center justify-center"><p role="status">{t('auth.loading')}</p></main>;
}
