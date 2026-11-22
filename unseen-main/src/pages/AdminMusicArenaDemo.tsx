import { lazy } from 'react';
import AdminPreviewGate from '@/components/admin/AdminPreviewGate';
import '@/championship.css';

const MusicArenaDemo = lazy(() => import('./MusicArenaDemo'));

export default function AdminMusicArenaDemo() {
  return <AdminPreviewGate path="/arena/musicale/demo" fallbackPath="/arena/musicale">
    <MusicArenaDemo />
  </AdminPreviewGate>;
}
