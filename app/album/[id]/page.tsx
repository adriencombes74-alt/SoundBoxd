import AlbumClientPage from './client-page';

// export const dynamicParams = true; // Interdit en mode export

export async function generateStaticParams() {
  // On génère un ID fictif pour forcer Next.js à reconnaître la fonction
  // Cela créera un fichier 'out/album/_placeholder.html' qui ne sera jamais utilisé
  return [{ id: '_placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  return <AlbumClientPage params={unwrappedParams} />;
}