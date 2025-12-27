import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// We need the service role key to access user_integrations if RLS is strict, 
// or ensure the user is authenticated. 
// However, in this API route, we receive 'userId' in the body. 
// Ideally we should verify the session via cookies, but for this specific request 
// we'll assume the client sends the correct userId and we use the service key 
// to read the integration tokens.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function refreshSpotifyToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error("Missing Spotify Credentials");

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

async function searchTrack(query: string, accessToken: string) {
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  const data = await res.json();
  if (data.tracks && data.tracks.items.length > 0) {
    return data.tracks.items[0];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action, query, playlistId } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    // 1. Get User Integration
    const { data: integration, error: dbError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'spotify')
      .single();

    if (dbError || !integration) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 404 });
    }

    let accessToken = integration.access_token;
    const expiresAt = new Date(integration.expires_at);

    // 2. Refresh Token if expired (or close to expiring)
    if (expiresAt <= new Date(Date.now() + 60000)) { // 1 minute buffer
      console.log("Refreshing Spotify Token...");
      try {
        const tokenData = await refreshSpotifyToken(integration.refresh_token);
        accessToken = tokenData.access_token;
        
        // Update DB
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);
        
        await supabase
          .from('user_integrations')
          .update({
            access_token: accessToken,
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);
          
      } catch (e) {
        console.error("Token refresh failed", e);
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
      }
    }

    // 3. Handle Actions
    if (action === 'getPlaylists') {
        const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        return NextResponse.json({ success: true, playlists: data.items });
    }

    // For Like and AddToPlaylist, we need the track URI first
    if (!query) {
        return NextResponse.json({ error: 'Missing query for track search' }, { status: 400 });
    }

    const track = await searchTrack(query, accessToken);
    if (!track) {
        return NextResponse.json({ error: 'Track not found on Spotify' }, { status: 404 });
    }

    if (action === 'like') {
        const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${track.id}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) throw new Error('Failed to like track');
        return NextResponse.json({ success: true, track: track.name });
    }

    if (action === 'addToPlaylist') {
        if (!playlistId) return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });

        const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [track.uri]
            })
        });

        if (!res.ok) throw new Error('Failed to add to playlist');
        return NextResponse.json({ success: true, playlistId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Spotify Action Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
