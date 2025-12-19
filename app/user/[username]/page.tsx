import UserProfileClientPage from './client-page';

// export const dynamicParams = true;

export async function generateStaticParams() {
  return [{ username: '_placeholder' }];
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const unwrappedParams = await params;
  return <UserProfileClientPage params={unwrappedParams} />;
}