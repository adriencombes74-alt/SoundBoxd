import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// L'import Supabase est SUPPRIMÉ pour isoler le crash
// import { createClient } from '@supabase/supabase-js'; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log("🚀 Callback started");
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Récupérer l'origine pour la redirection
    const baseUrl = process.env.SPOTIFY_REDIRECT_URI 
      ? new URL(process.env.SPOTIFY_REDIRECT_URI).origin 
      : new URL(request.url).origin;

    console.log("📍 Base URL:", baseUrl);

    if (error) {
      console.error("❌ Spotify error:", error);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=spotify_access_denied`);
    }

    if (!code || !state) {
      console.error("❌ Missing params");
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=missing_params`);
    }

    console.log("🍪 Reading cookies...");
    const cookieStore = await cookies();
    const savedState = cookieStore.get('spotify_auth_state')?.value;
    const userId = cookieStore.get('spotify_auth_user')?.value;

    console.log("👤 User:", userId, "State:", state === savedState ? "OK" : "MISMATCH");

    if (!savedState || state !== savedState || !userId) {
      console.error("❌ Invalid state or user");
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=invalid_state`);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error("❌ Config missing");
        return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    console.log("🔄 Exchanging token...");
    
    // Utilisation de btoa (standard Web) au lieu de Buffer (Node) pour éviter les soucis de runtime
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

    console.log("✅ Token received (Supabase disabled for test)");

    /* PARTIE SUPABASE COMMENTÉE
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    console.log("🗄️ Init Supabase...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    console.log("💾 Saving to DB...");
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
      console.error('❌ Database Error:', dbError);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=database_error`);
    }
    */

    console.log("✨ Success! Cleaning up cookies.");
    cookieStore.delete('spotify_auth_state');
    cookieStore.delete('spotify_auth_user');

    return NextResponse.redirect(`${baseUrl}/settings/connections?success=spotify_linked_TEST`);

  } catch (err: any) {
    console.error("🔥 CRITICAL ERROR:", err);
    // On essaie de rediriger même en cas de crash critique
    const baseUrl = process.env.SPOTIFY_REDIRECT_URI ? new URL(process.env.SPOTIFY_REDIRECT_URI).origin : "https://sound-boxd.vercel.app";
    return NextResponse.redirect(`${baseUrl}/settings/connections?error=server_error`);
  }
}
