import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Spotify configuration missing' }, { status: 500 });
  }

  // On encode le userId DANS le state pour le récupérer au retour sans cookies
  // Format simple : randomString:userId
  const randomPart = crypto.randomUUID();
  const state = `${randomPart}:${userId}`;

  const scope = 'user-read-currently-playing user-library-modify playlist-modify-public';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    state: state
  });

  console.log("🚀 Login started (No Cookies Mode)");
  console.log("📍 Redirect URI:", redirectUri);
  console.log("🔑 State generated:", state);

  const spotifyUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // Plus de cookies !
  return NextResponse.redirect(spotifyUrl);
}
