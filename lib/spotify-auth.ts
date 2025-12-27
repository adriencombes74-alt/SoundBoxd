import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getValidSpotifyToken(userId: string) {
  // 1. Get token from DB
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'spotify')
    .single();

  if (!integration) {
    throw new Error('Spotify account not linked');
  }

  // 2. Check expiry
  const expiresAt = new Date(integration.expires_at);
  const now = new Date();

  // If valid (with 5 min buffer), return it
  if (expiresAt > new Date(now.getTime() + 5 * 60000)) {
    return integration.access_token;
  }

  // 3. Refresh if expired
  console.log('🔄 Refreshing Spotify token for user', userId);
  
  if (!integration.refresh_token) {
    throw new Error('No refresh token available');
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Failed to refresh token', data);
    throw new Error('Failed to refresh Spotify token');
  }

  // 4. Update DB
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + data.expires_in);

  await supabase
    .from('user_integrations')
    .update({
      access_token: data.access_token,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
      // Update refresh token if provided (sometimes it rotates)
      ...(data.refresh_token ? { refresh_token: data.refresh_token } : {})
    })
    .eq('id', integration.id);

  return data.access_token;
}

