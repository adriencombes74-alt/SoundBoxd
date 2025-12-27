import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/settings/connections?error=spotify_access_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/connections?error=missing_params', request.url));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('spotify_auth_state')?.value;
  const userId = cookieStore.get('spotify_auth_user')?.value;

  // Validate State and User
  if (!savedState || state !== savedState || !userId) {
    return NextResponse.redirect(new URL('/settings/connections?error=invalid_state', request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  try {
    // 1. Exchange Code for Tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Spotify Token Error:', tokenData);
      return NextResponse.redirect(new URL('/settings/connections?error=token_exchange_failed', request.url));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // 2. Save to Supabase
    // Note: Using Service Role key if available to bypass RLS, otherwise Anon key
    // Ensure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local for this to work reliably with RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'spotify',
          access_token: access_token,
          refresh_token: refresh_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,provider' }
      );

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.redirect(new URL('/settings/connections?error=database_error', request.url));
    }

    // 3. Clear Cookies and Redirect
    cookieStore.delete('spotify_auth_state');
    cookieStore.delete('spotify_auth_user');

    return NextResponse.redirect(new URL('/settings/connections?success=spotify_linked', request.url));

  } catch (error) {
    console.error('Callback Error:', error);
    return NextResponse.redirect(new URL('/settings/connections?error=server_error', request.url));
  }
}

