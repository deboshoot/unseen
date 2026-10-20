import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useI18n } from '@/i18n/I18nProvider';
import '@/championship.css';

const MusicArenaDemo = lazy(() => import('./MusicArenaDemo'));
type Access = 'checking' | 'allowed' | 'login' | 'denied';

export default function AdminMusicArenaDemo() {
  const { t } = useI18n();
  const [access, setAccess] = useState<Access>('checking');
  const [revision, setRevision] = useState(0);
  const validation = useRef(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      // Hide the demo immediately and invalidate checks belonging to the old account.
      validation.current++;
      setAccess(session ? 'checking' : 'login');
      setRevision(value => value + 1);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    const version = ++validation.current;
    const update = (next: Access) => { if (mounted && version === validation.current) setAccess(next); };
    update('checking');
    const timeout = window.setTimeout(() => {
      update('denied');
      if (mounted && version === validation.current) validation.current++;
    }, 10000);
    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted || version !== validation.current) return;
        if (error) throw error;
        if (!session) { update('login'); return; }
        // The existing server-side administrator check determines access.
        const { data: admin, error: roleError } = await supabase.rpc('is_unseen_admin');
        if (roleError) throw roleError;
        update(admin === true ? 'allowed' : 'denied');
      } catch { update('denied'); }
      finally { window.clearTimeout(timeout); }
    })();
    return () => { mounted = false; window.clearTimeout(timeout); };
  }, [revision]);

  if (access === 'login') return <Navigate replace to="/auth?redirect=%2Farena%2Fmusicale%2Fdemo" />;
  if (access === 'denied') return <Navigate replace to="/arena/musicale" />;
  const waiting = <main className="min-h-screen flex items-center justify-center"><p role="status">{t('auth.loading')}</p></main>;
  if (access === 'checking') return waiting;
  return <Suspense fallback={waiting}><MusicArenaDemo /></Suspense>;
}
