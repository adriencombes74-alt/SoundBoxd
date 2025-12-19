import ArtistClientPage from './client-page';

// export const dynamicParams = true;

export async function generateStaticParams() {
  return [{ id: '_placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = await params;
  return <ArtistClientPage params={unwrappedParams} />;
}