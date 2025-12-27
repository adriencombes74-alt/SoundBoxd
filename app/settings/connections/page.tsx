import { Suspense } from 'react';
import ConnectionsClientPage from './client-page';

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Chargement...</div>}>
      <ConnectionsClientPage />
    </Suspense>
  );
}

