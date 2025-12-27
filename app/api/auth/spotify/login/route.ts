import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

  const state = crypto.randomUUID();
  const scope = 'user-read-currently-playing user-library-modify playlist-modify-public';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
    state: state
  });

  const spotifyUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  // Store state and userId in secure cookies
  const cookieStore = await cookies();
  
  // State cookie for CSRF protection
  cookieStore.set('spotify_auth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 3600, 
    path: '/' 
  });
  
  // User ID cookie to know who to link the account to
  cookieStore.set('spotify_auth_user', userId, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 3600, 
    path: '/' 
  });

  return NextResponse.redirect(spotifyUrl);
}

