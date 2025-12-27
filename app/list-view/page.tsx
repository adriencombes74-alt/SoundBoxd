import ListDetailsClientPage from './client-page';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ListDetailsClientPage />
    </Suspense>
  );
}

