import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log("🚀 Callback started (Fetch Mode)");
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.SPOTIFY_REDIRECT_URI 
      ? new URL(process.env.SPOTIFY_REDIRECT_URI).origin 
      : new URL(request.url).origin;

    if (error) {
      console.error("❌ Spotify error:", error);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=spotify_access_denied`);
    }

    if (!code || !state) {
      console.error("❌ Missing params");
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=missing_params`);
    }

    // Récupération userId
    const parts = state.split(':');
    if (parts.length < 2) {
         return NextResponse.redirect(`${baseUrl}/settings/connections?error=invalid_state`);
    }
    const userId = parts[1];
    console.log("👤 User ID:", userId);

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    // 1. Exchange Token (Spotify)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Spotify Token Error:', tokenData);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=token_exchange_failed`);
    }

    // 2. Save to Supabase via REST API (No SDK)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Supabase config missing");
        return NextResponse.redirect(`${baseUrl}/settings/connections?error=server_error`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // URL pour l'Upsert via RPC ou POST direct sur la table
    // Pour un upsert simple sur une table avec contrainte unique, on utilise POST avec Prefer: resolution=merge-duplicates
    const dbUrl = `${supabaseUrl}/rest/v1/user_integrations`;
    
    console.log("💾 Saving to DB via Fetch...");
    const dbResponse = await fetch(dbUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates' // C'est ça l'Upsert en REST !
        },
        body: JSON.stringify({
            user_id: userId,
            provider: 'spotify',
            access_token: access_token,
            refresh_token: refresh_token,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
        })
    });

    if (!dbResponse.ok) {
        const dbErr = await dbResponse.text();
        console.error('❌ Database Error (REST):', dbErr);
        return NextResponse.redirect(`${baseUrl}/settings/connections?error=database_error`);
    }

    console.log("✨ Success!");
    return NextResponse.redirect(`${baseUrl}/settings/connections?success=spotify_linked`);

  } catch (err: any) {
    console.error("🔥 CRITICAL ERROR:", err);
    const baseUrl = process.env.SPOTIFY_REDIRECT_URI ? new URL(process.env.SPOTIFY_REDIRECT_URI).origin : "https://sound-boxd.vercel.app";
    return NextResponse.redirect(`${baseUrl}/settings/connections?error=server_error`);
  }
}
