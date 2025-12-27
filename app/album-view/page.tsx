'use client';

import AlbumClientPage from './client-page';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <AlbumClientPage />
    </Suspense>
  );
}

